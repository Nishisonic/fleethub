import React from "react"
import { create } from "react-test-renderer"
import GearControlLabel from "."
import { mocked } from "ts-jest/utils"

import { useGear } from "../../../hooks"
jest.mock("../../../hooks")

const mockFn = mocked(useGear).mockReturnValue({
  fhGear: {} as any,
  actions: {
    remove: jest.fn(),
    update: jest.fn(),
  },
})

const mockAdd = jest.fn()

describe("GearCard", () => {
  it("renders correctly", () => {
    const tree = create(<GearControlLabel gear="" onReselect={mockAdd} />).toJSON()

    expect(useGear).toHaveBeenCalled()
    console.log(tree)
  })
})