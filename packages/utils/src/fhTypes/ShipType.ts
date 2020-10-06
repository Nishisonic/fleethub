/** 艦種 */
export enum ShipType {
  /** 海防艦 */
  DE = 1,
  /** 駆逐艦 */
  DD = 2,
  /** 軽巡洋艦 */
  CL = 3,
  /** 重雷装巡洋艦 */
  CLT = 4,
  /** 重巡洋艦 */
  CA = 5,
  /** 航空巡洋艦  */
  CAV = 6,
  /** 軽空母 */
  CVL = 7,
  /** 高速戦艦 */
  FBB = 8,
  /** 戦艦 */
  BB = 9,
  /** 航空戦艦 */
  BBV = 10,
  /** 正規空母 */
  CV = 11,
  /** 潜水艦 */
  SS = 13,
  /** 潜水空母 */
  SSV = 14,
  /** 輸送艦 */
  AP = 15,
  /** 水上機母艦 */
  AV = 16,
  /** 揚陸艦 */
  LHA = 17,
  /** 装甲空母 */
  CVB = 18,
  /** 工作艦 */
  AR = 19,
  /** 潜水母艦 */
  AS = 20,
  /** 練習巡洋艦 */
  CT = 21,
  /** 補給艦 */
  AO = 22,
}

export type HullCode = keyof typeof ShipType