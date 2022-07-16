use serde::{Deserialize, Serialize};
use tsify::Tsify;

use crate::{
    attack::{AttackParams, AttackPowerParams, DefenseParams, HitRateParams},
    ship::Ship,
    types::{
        gear_id, matches_gear_id, AttackPowerModifier, Engagement, GearAttr, GearType, ShipType,
        Side,
    },
};

const ASW_POWER_CAP: f64 = 170.0;
const ASW_ACCURACY_CONSTANT: f64 = 80.0;
const ASW_CRITICAL_RATE_CONSTANT: f64 = 1.1;

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Tsify)]
pub enum AswAttackType {
    DepthCharge,
    Aircraft,
}

impl AswAttackType {
    fn type_constant(&self) -> f64 {
        match self {
            Self::DepthCharge => 13.0,
            Self::Aircraft => 8.0,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum AswTime {
    Opening,
    Day,
    Night,
}

impl AswTime {
    fn is_opening(&self) -> bool {
        matches!(self, Self::Opening)
    }
}

pub struct FormationParams {
    pub power_mod: f64,
    pub accuracy_mod: f64,
    pub target_evasion_mod: f64,
}
pub struct AswAttackParams<'a> {
    pub time: AswTime,
    pub attack_type: AswAttackType,
    pub engagement: Engagement,
    pub formation_power_mod: f64,
    pub formation_accuracy_mod: f64,
    pub formation_evasion_mod: f64,

    pub attacker_side: Side,
    pub attacker: &'a Ship,
    pub target: &'a Ship,
}

impl AswAttackParams<'_> {
    pub fn attack_params(&self) -> AttackParams {
        let &Self {
            time,
            attack_type,
            engagement,
            formation_power_mod,
            formation_accuracy_mod,
            formation_evasion_mod,
            attacker_side,
            attacker,
            target,
        } = self;

        let target_side = attacker_side.not();

        let proficiency_mods = if time.is_opening() {
            None
        } else if matches!(
            attacker.ship_type,
            ShipType::CV | ShipType::CVB | ShipType::AO
        ) {
            None
        } else if attack_type == AswAttackType::DepthCharge {
            None
        } else {
            Some(attacker.proficiency_modifiers(None))
        };

        let armor_penetration = attacker.asw_armor_penetration();

        let calc_attack_power_params = || -> Option<AttackPowerParams> {
            let naked_asw = attacker.naked_asw()? as f64;

            let equip_asw = attacker.gears.sum_by(|gear| {
                if gear.has_attr(GearAttr::AntiSubWeapon) {
                    gear.asw
                } else {
                    0
                }
            }) as f64;

            let ibonus = attacker.gears.sum_by(|gear| gear.ibonuses.asw_power);
            let ebonus = attacker.ebonuses.asw as f64;

            let basic = naked_asw.sqrt() * 2.0
                + (equip_asw + ebonus) * 1.5
                + ibonus
                + attack_type.type_constant();

            let formation_mod = formation_power_mod;
            let engagement_mod = engagement.modifier();
            let damage_mod = attacker.damage_state().common_power_mod();
            let asw_synergy_mod = attacker.asw_synergy_mod();

            let a14 = damage_mod * formation_mod * engagement_mod * asw_synergy_mod;

            let precap_mod = AttackPowerModifier::new(a14, 0.0);

            let proficiency_critical_mod = proficiency_mods
                .as_ref()
                .map(|mods| mods.critical_power_mod);

            Some(AttackPowerParams {
                basic,
                cap: ASW_POWER_CAP,
                precap_mod,
                postcap_mod: Default::default(),
                proficiency_critical_mod,
                armor_penetration,
                remaining_ammo_mod: attacker.remaining_ammo_mod(),
                ap_shell_mod: None,
                carrier_power: None,
                special_enemy_mods: Default::default(),
                custom_mods: attacker.custom_power_mods(),
            })
        };

        let calc_accuracy_term = || {
            let basic_accuracy_term = attacker.basic_accuracy_term()?;

            // 爆雷命中補正
            // 九五式爆雷 二式爆雷
            // https://twitter.com/kankenRJ/status/944494853580210177
            //
            // 対潜の単純合計ではない
            // https://twitter.com/shiro_sh39/status/1514416400227479552
            //
            // Hedgehog(初期型)は無し
            // https://twitter.com/panmodoki10/status/1522507740274651136
            // 暫定 4 * 個数
            let asw_equipment_mod = attacker.gears.sum_by(|gear| {
                if gear.gear_type == GearType::Sonar {
                    2.0 * (gear.asw as f64)
                } else if matches_gear_id!(gear.gear_id, "九五式爆雷" | "二式爆雷") {
                    4.0
                } else {
                    0.0
                }
            });

            let ibonus = attacker.gears.sum_by(|gear| gear.ibonuses.asw_accuracy);

            let formation_mod = formation_accuracy_mod;
            let morale_mod = attacker.morale_state().common_accuracy_mod();

            // 乗算前に切り捨て
            let pre_multiplication =
                (ASW_ACCURACY_CONSTANT + basic_accuracy_term + asw_equipment_mod + ibonus).floor();

            Some(pre_multiplication * formation_mod * morale_mod)
        };

        let calc_hit_rate_params = || {
            let accuracy_term = calc_accuracy_term()?;
            let evasion_term = target.evasion_term(formation_evasion_mod, 0.0, 1.0)?;

            let hit_percentage_bonus = proficiency_mods
                .as_ref()
                .map(|mods| mods.hit_percentage_bonus)
                .unwrap_or_default();

            let critical_percentage_bonus = proficiency_mods
                .as_ref()
                .map(|mods| mods.critical_percentage_bonus)
                .unwrap_or_default();

            Some(HitRateParams {
                accuracy_term,
                evasion_term,
                target_morale_mod: target.morale_state().hit_rate_mod(),
                critical_rate_constant: ASW_CRITICAL_RATE_CONSTANT,
                critical_percentage_bonus,
                hit_percentage_bonus,
            })
        };

        let attack_power_params = calc_attack_power_params();
        let hit_rate_params = calc_hit_rate_params();
        let defense_params = DefenseParams::from_target(target, target_side, armor_penetration);

        AttackParams {
            attack_power_params,
            hit_rate_params,
            defense_params,
            hits: 1.0,
            is_cutin: false,
        }
    }
}