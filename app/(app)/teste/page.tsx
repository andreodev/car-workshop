"use client"
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader } from "@/components/ui/dialog";
import { DialogContent, DialogDescription, DialogTitle } from "@radix-ui/react-dialog";
import { useState } from "react";

export default function Page() {
  const [openModal, setModalOpen] = useState(false)

  console.log(openModal)
  return(
    <div>
      <Button onClick={() => setModalOpen(true)}>
      teste
      </Button>
      <Dialog open={openModal} onOpenChange={setModalOpen}>
       <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
         <DialogHeader>
          <DialogTitle>
            teste
          </DialogTitle>
          <DialogDescription>
            alou
          </DialogDescription>
        </DialogHeader>
       </DialogContent>
      </Dialog>
    </div>
  )
}