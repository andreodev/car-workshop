"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const PdvSaleDialog = dynamic(
  () => import("./pdv-sale-dialog").then((mod) => mod.PdvSaleDialog),
  { ssr: false }
);

type PdvLauncherProps = {
  defaultResponsible: string;
};

export function PdvLauncher({ defaultResponsible }: PdvLauncherProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "F2") {
        return;
      }

      if (document.querySelector("[data-pdv-dialog='true']")) {
        return;
      }

      event.preventDefault();
      setOpen(true);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {open ? (
        <PdvSaleDialog
          open={open}
          defaultResponsible={defaultResponsible}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
