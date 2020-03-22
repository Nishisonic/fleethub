import { EntityId, createEntityAdapter } from "@reduxjs/toolkit"
import { GearEntity, GearState, gearToEntity } from "./gear"
import { getUid, isNonNullable, NullableArray } from "../../utils"

type AirCorpsState = {
  slots: number[]
  gears: NullableArray<GearState>
}

type AirCorpsEntity = {
  uid: EntityId
  slots: number[]
  gears: NullableArray<EntityId>
}

type NormalizedAirCorps = {
  airCorps: AirCorpsEntity
  gears: GearEntity[]
}

export const normalizeAirCorps = (airCorpsState: AirCorpsState): NormalizedAirCorps => {
  const gears = (airCorpsState.gears ?? []).map((gear) => gear && gearToEntity(gear))
  const gearIds = gears.map((gear) => gear?.uid)

  const airCorps: AirCorpsEntity = { uid: getUid(), ...airCorpsState, gears: gearIds }

  return { airCorps, gears: gears.filter(isNonNullable) }
}

export const airCorpsAdapter = createEntityAdapter<AirCorpsEntity>({
  selectId: (entity) => entity.uid,
})
