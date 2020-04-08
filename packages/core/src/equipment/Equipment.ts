import { Gear } from "../gear"
import { NullableArray, PickByValue } from "../utils"

const slotIndexes = ["slot1", "slot2", "slot3", "slot4", "slot5", "exslot"] as const
type SlotIndex = typeof slotIndexes[number]

type GearIteratee<R> = (gear: Gear, index: SlotIndex) => R

export type Equipment = {
  initialSlots: number[]
  currentSlots: number[]

  forEach: (fn: GearIteratee<void>) => void
  has: (fn: GearIteratee<boolean>) => boolean
  count: (fn?: GearIteratee<boolean>) => number
  map: <R>(fn: GearIteratee<R>) => R[]
  sumBy: (fn: GearIteratee<number> | keyof PickByValue<Gear, number>) => number
}

export class EquipmentImpl implements Equipment {
  public readonly size: number

  private entries: Array<[Gear, SlotIndex]> = []

  constructor(gears: NullableArray<Gear>, public initialSlots: number[], public currentSlots = initialSlots) {
    this.size = initialSlots.length

    slotIndexes.forEach((slotIndex, index) => {
      const gear = gears[index]
      const inExslot = index >= this.size
      if (gear) this.entries.push([gear, inExslot ? "exslot" : slotIndex])
    })
  }

  public forEach = (fn: GearIteratee<void>) => this.entries.forEach((entry) => fn(...entry))

  public has: Equipment["has"] = (fn) => this.entries.some((entry) => fn(...entry))

  public count: Equipment["count"] = (fn) => {
    if (!fn) {
      return this.entries.length
    }

    return this.entries.filter((entry) => fn(...entry)).length
  }

  public map: Equipment["map"] = (fn) => this.entries.map((entry) => fn(...entry))

  public sumBy: Equipment["sumBy"] = (fn) => {
    if (typeof fn === "function") {
      return this.map(fn).reduce((a, b) => a + b, 0)
    }
    return this.map((gear) => gear[fn]).reduce((a, b) => a + b, 0)
  }
}