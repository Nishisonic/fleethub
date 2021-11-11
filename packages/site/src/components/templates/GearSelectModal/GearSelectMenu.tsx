/** @jsxImportSource @emotion/react */
import { nonNullable } from "@fh/utils";
import ListIcon from "@mui/icons-material/List";
import SearchIcon from "@mui/icons-material/Search";
import { nanoid } from "@reduxjs/toolkit";
import { Gear } from "fleethub-core";
import React, { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import { useFhCore, useShip } from "../../../hooks";
import { equip } from "../../../store";
import { makeGetNextEbonuses } from "../../../utils";
import { Tabs, TabsProps } from "../../molecules";
import GearList from "../GearList";
import GearSearchMenu from "./GearSearchMenu";

const GearSelectMenu: React.FCX = () => {
  const { module, core, masterData } = useFhCore();

  const gears = useMemo(
    () =>
      masterData.gears
        .map((mg) => core.create_gear({ gear_id: mg.gear_id }))
        .filter(nonNullable),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const dispatch = useDispatch();
  const create = useSelector((root) => root.present.gearSelect.create);
  const position = useSelector((root) => root.present.gearSelect.position);

  const ship = useShip(position?.id);
  const key = position?.key;

  let canEquip: ((gear: Gear) => boolean) | undefined;

  if (position?.tag === "airSquadron") {
    canEquip = module.air_squadron_can_equip;
  } else if (ship) {
    canEquip = (gear) => ship.can_equip(gear, position?.key || "g1");
  }
  const getNextEbonuses = ship && key && makeGetNextEbonuses(ship, key);

  const handleSelect = (gear: Gear) => {
    if (!create || !position) return;

    const newGear = {
      gear_id: gear.gear_id,
      id: nanoid(),
    };

    dispatch(
      equip({
        ...position,
        changes: { [position.key]: newGear.id },
        entities: { gears: [newGear] },
      })
    );
  };

  const list: TabsProps["list"] = [
    {
      icon: <ListIcon />,
      iconPosition: "start" as const,
      label: "List",
      panel: (
        <GearList
          gears={gears}
          canEquip={canEquip}
          getNextEbonuses={getNextEbonuses}
          onSelect={handleSelect}
        />
      ),
    },
    {
      icon: <SearchIcon />,
      iconPosition: "start" as const,
      label: "検索",
      panel: <GearSearchMenu gears={gears} />,
    },
  ];

  return (
    <div>
      <Tabs sx={{ mb: 1 }} size="small" list={list} />
    </div>
  );
};

export default GearSelectMenu;