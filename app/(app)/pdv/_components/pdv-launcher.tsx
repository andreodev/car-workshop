"use client";

import { useEffect, useState } from "react";

import { PdvSaleDialog } from "./pdv-sale-dialog";

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

      event.preventDefault();
      setOpen(true);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <PdvSaleDialog
      open={open}
      defaultResponsible={defaultResponsible}
      onClose={() => setOpen(false)}
    />
  );
}
