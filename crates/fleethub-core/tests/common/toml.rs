use fleethub_core::{comp::Comp, fleet::Fleet, ship::Ship};
use toml_edit::easy::{toml, Value};

use super::FH_CORE;

fn walk<F: FnMut(&mut Value)>(input: &mut Value, f: &mut F) {
    use Value::*;

    f(input);

    match input {
        Array(array) => array.iter_mut().for_each(|value| walk(value, f)),
        Table(table) => table.iter_mut().for_each(|(_, value)| walk(value, f)),
        _ => (),
    }
}

fn set_ship_id(value: &mut Value) {
    if let Some(name) = value.get("ship_id").and_then(|v| v.as_str()) {
        let id = FH_CORE
            .master_data()
            .ships
            .iter()
            .find_map(|ship| (ship.name == name).then(|| ship.ship_id as u32))
            .unwrap_or_else(|| panic!("\"{name}\" does not exist"));

        value["ship_id"] = id.into();
    }
}

fn set_gear_id(value: &mut Value) {
    fn get_id(field: &Value) -> Option<i64> {
        match field {
            Value::String(name) => {
                if name.is_empty() {
                    return Some(0);
                }

                let id = FH_CORE
                    .master_data()
                    .gears
                    .iter()
                    .find_map(|gear| (&gear.name == name).then(|| gear.gear_id))
                    .unwrap_or_else(|| panic!("\"{name}\" does not exist"))
                    as i64;

                Some(id)
            }
            &Value::Integer(id) => Some(id),
            _ => None,
        }
    }

    for key in ["g1", "g2", "g3", "g4", "g5", "gx"] {
        if let Some(id) = value.get(key).and_then(get_id) {
            value[key] = toml! {
                gear_id = id
            };
        }
    }

    if let Some(id) = value.get("gear_id").and_then(get_id) {
        value["gear_id"] = id.into();
    }
}

pub fn format_toml(input: &mut Value) {
    walk(input, &mut set_ship_id);
    walk(input, &mut set_gear_id);
}

pub fn ship_from_toml(mut toml: Value) -> Ship {
    format_toml(&mut toml);
    let state = toml.try_into().unwrap();
    FH_CORE.create_ship(Some(state)).unwrap()
}

pub fn fleet_from_toml(mut toml: Value) -> Fleet {
    format_toml(&mut toml);
    let state = toml.try_into().unwrap();
    FH_CORE.create_fleet(Some(state))
}

pub fn comp_from_toml(mut toml: Value) -> Comp {
    format_toml(&mut toml);
    let state = toml.try_into().unwrap();
    let org = FH_CORE.create_org(state).unwrap();
    org.create_comp()
}

#[macro_export]
macro_rules! gear {
    ($($toml:tt)+) => {{
        let mut toml = toml_edit::easy::toml!($($toml)+);
        $crate::common::format_toml(&mut toml);
        let state = toml.try_into().unwrap();
        $crate::common::FH_CORE.create_gear(state).unwrap()
    }};
}

#[macro_export]
macro_rules! ship {
    ($($toml:tt)+) => {
        $crate::common::ship_from_toml(toml_edit::easy::toml!($($toml)+))
    };
}
