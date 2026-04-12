'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, Camera, Check, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { uploadDocument } from '@/lib/api'

interface UploadedFile {
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'success' | 'error'
}

export default function PassengerVerifyPage() {
  const router = useRouter()
  const documentInputRef = useRef<HTMLInputElement>(null)
  const selfieInputRef = useRef<HTMLInputElement>(null)
  
  const [document, setDocument] = useState<UploadedFile | null>(null)
  const [selfie, setSelfie] = useState<UploadedFile | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'document' | 'selfie'
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    const preview = URL.createObjectURL(file)
    const uploadedFile: UploadedFile = { file, preview, status: 'pending' }

    if (type === 'document') {
      setDocument(uploadedFile)
    } else {
      setSelfie(uploadedFile)
    }
  }

  const handleUpload = async () => {
    if (!document || !selfie) return

    setLoading(true)
    setDocument(prev => prev ? { ...prev, status: 'uploading' } : null)
    setSelfie(prev => prev ? { ...prev, status: 'uploading' } : null)

    try {
      await uploadDocument('document', document.file)
      setDocument(prev => prev ? { ...prev, status: 'success' } : null)

      await uploadDocument('selfie', selfie.file)
      setSelfie(prev => prev ? { ...prev, status: 'success' } : null)

      // Aguarda um pouco para mostrar sucesso
      setTimeout(() => {
        router.push('/passenger/home')
      }, 1000)
    } catch {
      setDocument(prev => prev ? { ...prev, status: 'error' } : null)
      setSelfie(prev => prev ? { ...prev, status: 'error' } : null)
    } finally {
      setLoading(false)
    }
  }

  const removeFile = (type: 'document' | 'selfie') => {
    if (type === 'document') {
      if (document?.preview) URL.revokeObjectURL(document.preview)
      setDocument(null)
    } else {
      if (selfie?.preview) URL.revokeObjectURL(selfie.preview)
      setSelfie(null)
    }
  }

  const canContinue = document && selfie && !loading

  return (
    <main className="flex min-h-screen flex-col bg-background p-4">
      <div className="mx-auto w-full max-w-lg">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/passenger/register">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <Logo size="sm" />
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-primary" />
          <div className="h-1 flex-1 rounded-full bg-primary" />
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Validação de Identidade</CardTitle>
            <CardDescription>
              Para sua segurança, precisamos verificar sua identidade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upload Documento */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Documento de identificação (RG ou CNH)
              </label>
              <input
                ref={documentInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'document')}
              />
              
              {document ? (
                <div className="relative overflow-hidden rounded-xl border-2 border-primary">
                  <Image
                    src={document.preview}
                    alt="Documento"
                    width={400}
                    height={250}
                    className="h-48 w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    {document.status === 'uploading' && (
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    )}
                    {document.status === 'success' && (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                        <Check className="h-6 w-6 text-accent-foreground" />
                      </div>
                    )}
                    {document.status === 'pending' && (
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => removeFile('document')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => documentInputRef.current?.click()}
                  className="flex h-48 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 transition-colors hover:border-primary hover:bg-muted/50"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Clique para fazer upload
                  </span>
                </button>
              )}
            </div>

            {/* Upload Selfie */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Selfie segurando o documento
              </label>
              <input
                ref={selfieInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'selfie')}
              />
              
              {selfie ? (
                <div className="relative overflow-hidden rounded-xl border-2 border-primary">
                  <Image
                    src={selfie.preview}
                    alt="Selfie"
                    width={400}
                    height={250}
                    className="h-48 w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    {selfie.status === 'uploading' && (
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    )}
                    {selfie.status === 'success' && (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                        <Check className="h-6 w-6 text-accent-foreground" />
                      </div>
                    )}
                    {selfie.status === 'pending' && (
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => removeFile('selfie')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => selfieInputRef.current?.click()}
                  className="flex h-48 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 transition-colors hover:border-primary hover:bg-muted/50"
                >
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Clique para tirar uma selfie
                  </span>
                </button>
              )}
            </div>

            <Button
              onClick={handleUpload}
              disabled={!canContinue}
              className="h-12 w-full text-base font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Finalizar cadastro'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
