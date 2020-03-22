import React from "react"
import { useSelector, useDispatch } from "react-redux"
import { EntityId } from "@reduxjs/toolkit"

import { entitiesSlice, fleetsSelectors, ShipState, FleetRole } from "../store"
import { useShipSelect } from "./useShipSelect"

export const useFleet = (uid: EntityId) => {
  const dispatch = useDispatch()
  const shipSelect = useShipSelect()
  const entity = useSelector((state) => fleetsSelectors.selectEntities(state)[uid])

  const actions = React.useMemo(
    () => ({
      remove: () => {
        dispatch(entitiesSlice.actions.removeFleet(uid))
      },
      createShip: (role: FleetRole, index: number, ship: ShipState) => {
        dispatch(entitiesSlice.actions.createShip({ fleet: uid, role, index, ship }))
      },
    }),
    [dispatch, uid]
  )

  const openShipSelect = React.useCallback(
    (role: FleetRole, index: number) => {
      shipSelect.open({ position: { fleet: uid, role, index } })
    },
    [shipSelect]
  )

  return { entity, actions, openShipSelect }
}
