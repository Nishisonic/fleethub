/** @jsxImportSource @emotion/react */
import { createEquipmentBonuses } from "equipment-bonus";
import type { GetStaticProps, NextComponentType, NextPageContext } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import dynamic from "next/dynamic";
import Head from "next/head";
import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { AppContent } from "../components/templates";
import { fetchMasterData } from "../firebase";
import { FhCoreContext } from "../hooks";
import { StoreProvider } from "../store";

const loader = async () => {
  const [module, masterData] = await Promise.all([
    import("fleethub-core"),
    fetchMasterData(),
  ]);

  const App: React.FC = () => {
    const core = new module.FhCore(masterData, createEquipmentBonuses);

    if (process.env.NODE_ENV === "development") {
      module.set_panic_hook();
    }

    return (
      <FhCoreContext.Provider value={{ masterData, module, core }}>
        <StoreProvider masterData={masterData}>
          <AppContent />
        </StoreProvider>
      </FhCoreContext.Provider>
    );
  };

  return App;
};

const App = dynamic(loader);

const Index: NextComponentType<NextPageContext, unknown> = () => {
  return (
    <div>
      <Head>
        <title>作戦室</title>
        <meta
          name="description"
          content="作戦室は艦これの編成を支援するサイトです。弾着率、対地火力などの計算が行えます。"
        />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:creator" content="@MadonoHaru" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <DndProvider backend={HTML5Backend}>
        <App />
      </DndProvider>
    </div>
  );
};

export const getStaticProps: GetStaticProps = async ({ locale = "" }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale, [
        "common",
        "gears",
        "gear_types",
        "ships",
        "ctype",
      ])),
    },
  };
};

export default Index;
