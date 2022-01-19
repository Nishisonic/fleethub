import { mapValues, nonNullable, pick, promiseAllValues } from "@fh/utils";
import { MasterData, MasterEquippable } from "fleethub-core";
import {
  GoogleSpreadsheet,
  GoogleSpreadsheetRow,
  GoogleSpreadsheetWorksheet,
} from "google-spreadsheet";
import { Auth, google, sheets_v4 } from "googleapis";
import { Start2 } from "kc-tools";

import { getServiceAccount } from "../credentials";
import { createUpdateRowsRequests } from "../utils";

import { createConfig } from "./config";
import { createGearData } from "./gear";
import { createShipData } from "./ship";

const createEquippable = (start2: Start2): MasterEquippable => {
  const equip_exslot = start2.api_mst_equip_exslot;
  const equip_ship = start2.api_mst_equip_ship;
  const equip_exslot_ship = start2.api_mst_equip_exslot_ship;

  const equip_stype = start2.api_mst_stype.map((stype) => {
    const id = stype.api_id;
    const equip_type = Object.entries(stype.api_equip_type)
      .filter(([, equippable]) => equippable === 1)
      .map(([gtype]) => Number(gtype));

    return { id, equip_type };
  });

  return { equip_stype, equip_exslot, equip_ship, equip_exslot_ship };
};

const sheetTitleMap = {
  ships: "艦娘",
  ship_types: "艦種",
  ship_classes: "艦級",
  ship_attars: "艦娘属性",
  gears: "装備",
  gear_types: "装備種",
  gear_attrs: "装備属性",

  // 改修
  shelling_power: "改修砲撃攻撃力",
  shelling_accuracy: "改修砲撃命中",
  carrier_shelling_power: "改修空母砲撃攻撃力",
  torpedo_power: "改修雷撃攻撃力",
  torpedo_accuracy: "改修雷撃命中",
  torpedo_evasion: "改修雷撃回避",
  night_power: "改修夜戦攻撃力",
  night_accuracy: "改修夜戦命中",
  asw_power: "改修対潜攻撃力",
  asw_accuracy: "改修対潜命中",
  defense_power: "改修防御力",
  contact_selection: "改修触接選択率",
  fighter_power: "改修制空",
  adjusted_anti_air: "改修加重対空",
  fleet_anti_air: "改修艦隊対空",
  elos: "改修マップ索敵",

  //設定
  anti_air_cutin: "対空CI",
  day_cutin: "昼戦CI",
  night_cutin: "夜戦CI",
  formation: "陣形",
};

export type SheetRecord = Record<keyof typeof sheetTitleMap, Sheet>;

const SHEET_ID = "1IQRy3OyMToqqkopCkQY9zoWW-Snf7OjdrALqwciyyRA";

type AuthClient =
  | Auth.Compute
  | Auth.JWT
  | Auth.UserRefreshClient
  | Auth.BaseExternalAccountClient
  | Auth.Impersonated;

let auth: AuthClient;

async function getAuth(): Promise<AuthClient> {
  if (auth) {
    return auth;
  }

  auth = await google.auth.getClient({
    credentials: getServiceAccount(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return auth;
}

async function getGoogleSpreadsheet() {
  const doc = new GoogleSpreadsheet(SHEET_ID);
  const auth = await getAuth();
  doc.useOAuth2Client(auth);

  return doc;
}

export class Sheet {
  static async read(inner: GoogleSpreadsheetWorksheet) {
    const rows = await inner.getRows();
    return new Sheet(inner, rows);
  }

  static async readByKey(key: keyof SheetRecord) {
    const doc = await getGoogleSpreadsheet();
    const title = sheetTitleMap[key];
    return Sheet.read(doc.sheetsByTitle[title]);
  }

  constructor(
    public inner: GoogleSpreadsheetWorksheet,
    public rows: GoogleSpreadsheetRow[]
  ) {}

  headerValues() {
    return this.inner.headerValues;
  }

  createUpdateRowsRequests(data: object[]) {
    const { sheetId, headerValues } = this.inner;

    return createUpdateRowsRequests(
      Number(sheetId),
      headerValues,
      this.rows,
      data
    );
  }

  async write(data: object[]) {
    const requests = this.createUpdateRowsRequests(data);

    if (!requests.length) {
      return;
    }

    const auth = await getAuth();

    const client = google.sheets({
      version: "v4",
      auth,
    }).spreadsheets;

    await client.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests,
      },
    });
  }
}

export class MasterDataSpreadsheet {
  static async init() {
    const auth = await getAuth();

    const client = google.sheets({
      version: "v4",
      auth,
    }).spreadsheets;

    const doc = await getGoogleSpreadsheet();
    await doc.loadInfo();

    const sheets = await promiseAllValues(
      mapValues(sheetTitleMap, (title) => Sheet.read(doc.sheetsByTitle[title]))
    );

    return new MasterDataSpreadsheet(client, doc, sheets);
  }

  private constructor(
    public client: sheets_v4.Resource$Spreadsheets,
    public doc: GoogleSpreadsheet,
    public sheets: SheetRecord
  ) {}

  pickSheets<K extends keyof SheetRecord>(keys: K[]) {
    return pick(this.sheets, keys);
  }

  createMasterData(start2: Start2): Partial<MasterData> {
    const shipData = createShipData(this, start2);
    const gearData = createGearData(this, start2);
    const equippable = createEquippable(start2);
    const config = createConfig(this);

    return {
      ...shipData,
      ...gearData,
      equippable,
      config,
    };
  }

  async writeMasterData(md: Partial<MasterData>) {
    const keys = ["ships", "gears"] as const;

    const requests = keys
      .flatMap((key) => {
        const sheet = this.sheets[key];
        const data = md[key];

        return data && sheet.createUpdateRowsRequests(data);
      })
      .filter(nonNullable);

    if (requests.length) {
      await this.client.batchUpdate({
        spreadsheetId: this.doc.spreadsheetId,
        requestBody: {
          requests,
        },
      });
    }
  }
}
