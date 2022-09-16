mod air_combat;
mod air_state;
mod attack_power_modifier;
mod attack_style;
mod attack_type;
mod battle_conditions;
mod battle_definitions;
mod comp_type;
mod compiled_evaler;
mod const_id;
mod contact_rank;
mod cutin;
mod damage_state;
mod defense_power;
mod ebonus;
mod engagement;
mod fleet_factors;
mod fleet_key;
mod fleet_type;
mod formation;
mod gear_attr;
mod gear_type;
mod gear_type_id_array;
mod matchup;
mod meta;
mod morale_state;
mod node_state;
mod org_type;
mod participant;
mod phase;
mod position;
mod proficiency_modifiers;
mod role;
mod ship_attr;
mod ship_conditions;
mod ship_key;
mod ship_type;
mod side;
mod slot_size_vec;
mod special_enemy_type;
mod speed;
mod state;

pub use air_combat::*;
pub use air_state::*;
pub use attack_power_modifier::*;
pub use attack_style::*;
pub use attack_type::*;
pub use battle_conditions::*;
pub use battle_definitions::*;
pub use comp_type::*;
pub use compiled_evaler::*;
pub use const_id::*;
pub use contact_rank::*;
pub use cutin::*;
pub use damage_state::*;
pub use defense_power::*;
pub use ebonus::*;
pub use engagement::*;
pub use engagement::*;
pub use fleet_factors::*;
pub use fleet_key::*;
pub use fleet_type::*;
pub use formation::*;
pub use gear_attr::*;
pub use gear_type::*;
pub use gear_type_id_array::*;
pub use meta::*;
pub use morale_state::*;
pub use node_state::*;
pub use org_type::*;
pub use participant::*;
pub use phase::*;
pub use position::*;
pub use proficiency_modifiers::*;
pub use role::*;
pub use ship_attr::*;
pub use ship_conditions::*;
pub use ship_key::*;
pub use ship_type::*;
pub use side::*;
pub use slot_size_vec::*;
pub use special_enemy_type::*;
pub use speed::*;
pub use state::*;

#[derive(Debug, Clone, Copy)]
pub struct HistoricalParams {
    pub power_mod: f64,
    pub accuracy_mod: f64,
    pub target_evasion_mod: f64,
}

impl Default for HistoricalParams {
    fn default() -> Self {
        Self {
            power_mod: 1.0,
            accuracy_mod: 1.0,
            target_evasion_mod: 1.0,
        }
    }
}
