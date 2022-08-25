use serde::Serialize;
use tsify::Tsify;

use crate::{
    comp::Comp,
    member::BattleMemberRef,
    ship::Ship,
    types::{AirState, BattleDefinitions, DayPhaseAttackStyle, Engagement, Formation, Role},
    utils::some_or_return,
};

use super::{ActionReport, AttackAnalyzer, AttackAnalyzerConfig, AttackAnalyzerShipConfig};

pub struct DayCutinAnalyzer<'a> {
    pub battle_defs: &'a BattleDefinitions,
    pub comp: &'a Comp,
    pub dummy: &'a Ship,
    pub engagement: Engagement,
    pub formation: Formation,
}

#[derive(Serialize, Tsify)]
struct DayCutinReport {
    observation_term: Option<f64>,
    #[serde(flatten)]
    report: ActionReport<DayPhaseAttackStyle>,
}

#[derive(Serialize, Tsify)]
struct ShipDayCutinAnalysis {
    ship_id: u16,
    role: Role,
    index: usize,
    rank3: DayCutinReport,
    rank2: DayCutinReport,
}

#[derive(Serialize, Tsify)]
pub struct CompDayCutinAnalysis {
    rank3_air_state: AirState,
    rank2_air_state: AirState,
    main_fleet_los_mod: Option<f64>,
    escort_fleet_los_mod: Option<f64>,
    ships: Vec<ShipDayCutinAnalysis>,
}

impl DayCutinAnalyzer<'_> {
    fn air_states(&self) -> [AirState; 2] {
        if self.comp.side().is_player() {
            [AirState::AirSupremacy, AirState::AirSuperiority]
        } else {
            [AirState::AirDenial, AirState::AirIncapability]
        }
    }

    fn analyze_ship_with_air_state(
        &self,
        ship: &BattleMemberRef,
        air_state: AirState,
        fleet_los_mod: Option<f64>,
    ) -> DayCutinReport {
        let attack_analyzer = AttackAnalyzer {
            battle_defs: self.battle_defs,
            config: AttackAnalyzerConfig {
                air_state,
                engagement: self.engagement,
                attacker: AttackAnalyzerShipConfig {
                    conditions: ship.conditions(),
                    fleet_los_mod,
                    night_fleet_conditions: Default::default(),
                },
                target: AttackAnalyzerShipConfig::dummy_enemy(),
            },
            attacker: ship,
            target: self.dummy,
        };

        let observation_term = attack_analyzer.calc_observation_term();
        let report = attack_analyzer.analyze_day_phase_action();

        DayCutinReport {
            observation_term,
            report,
        }
    }

    fn analyze_ship(
        &self,
        fleet_los_mod: Option<f64>,
        role: Role,
        index: usize,
    ) -> Option<ShipDayCutinAnalysis> {
        let ship = self.comp.get_battle_member(self.formation, role, index)?;
        let air_states = self.air_states();

        let [rank3, rank2] = air_states
            .map(|air_state| self.analyze_ship_with_air_state(&ship, air_state, fleet_los_mod));

        Some(ShipDayCutinAnalysis {
            ship_id: ship.ship_id,
            role: ship.position.role,
            index: ship.position.index,
            rank3,
            rank2,
        })
    }

    fn analyze_fleet(&self, role: Role) -> Vec<ShipDayCutinAnalysis> {
        let fleet = some_or_return!(self.comp.get_fleet(role), vec![]);
        let fleet_los_mod = fleet.fleet_los_mod();

        fleet
            .ships
            .iter()
            .filter_map(|(index, _)| self.analyze_ship(fleet_los_mod, role, index))
            .collect()
    }

    fn fleet_los_mod(&self, role: Role) -> Option<f64> {
        self.comp
            .get_fleet(role)
            .and_then(|fleet| fleet.fleet_los_mod())
    }

    pub fn analyze(&self) -> CompDayCutinAnalysis {
        let ships = [Role::Main, Role::Escort]
            .into_iter()
            .flat_map(|role| self.analyze_fleet(role))
            .collect();
        let [rank3_air_state, rank2_air_state] = self.air_states();

        CompDayCutinAnalysis {
            rank3_air_state,
            rank2_air_state,
            main_fleet_los_mod: self.fleet_los_mod(Role::Main),
            escort_fleet_los_mod: self.fleet_los_mod(Role::Escort),
            ships,
        }
    }
}
