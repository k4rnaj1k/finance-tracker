"use client"

import { useState, useEffect } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export function InstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if the app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
      return
    }

    // Store the install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // Handle app installed event
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true)
      setIsInstallable(false)
    })

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!installPrompt) return

    // Show the install prompt
    await installPrompt.prompt()

    // Wait for the user to respond to the prompt
    const choiceResult = await installPrompt.userChoice

    if (choiceResult.outcome === "accepted") {
      console.log("User accepted the install prompt")
    } else {
      console.log("User dismissed the install prompt")
    }

    // Clear the saved prompt as it can't be used again
    setInstallPrompt(null)
    setIsInstallable(false)
  }

  if (!isInstallable || isInstalled) return null

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle>Install App</CardTitle>
        <CardDescription>Install this app on your device for offline use</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleInstallClick}>
          <Download className="h-4 w-4 mr-2" />
          Install Finance Tracker
        </Button>
      </CardContent>
    </Card>
  )
}
