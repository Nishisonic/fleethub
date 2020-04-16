import React from "react"
import styled from "styled-components"

import SlotListItem, { Props as SlotListItemProps } from "./SlotListItem"
type Props = Omit<SlotListItemProps, "index">

const EquipmentSlotList: React.FCX<Props> = ({ className, ...props }) => {
  return (
    <div className={className}>
      {props.gears.map((gear, index) => (
        <SlotListItem key={index} index={index} {...props} />
      ))}
    </div>
  )
}

const Styled = styled(EquipmentSlotList)`
  width: 100%;

  > * {
    height: 24px;
  }
`

export default Styled