'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, Check, X, Loader2, FileText } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { uploadDocument } from '@/lib/api'

interface UploadedFile {
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'success' | 'error'
}

export default function DriverDocumentsPage() {
  const router = useRouter()
  const cnhInputRef = useRef<HTMLInputElement>(null)
  const crlvInputRef = useRef<HTMLInputElement>(null)
  
  const [cnh, setCnh] = useState<UploadedFile | null>(null)
  const [crlv, setCrlv] = useState<UploadedFile | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'cnh' | 'crlv'
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    const preview = URL.createObjectURL(file)
    const uploadedFile: UploadedFile = { file, preview, status: 'pending' }

    if (type === 'cnh') {
      setCnh(uploadedFile)
    } else {
      setCrlv(uploadedFile)
    }
  }

  const handleUpload = async () => {
    if (!cnh || !crlv) return

    setLoading(true)
    setCnh(prev => prev ? { ...prev, status: 'uploading' } : null)
    setCrlv(prev => prev ? { ...prev, status: 'uploading' } : null)

    try {
      await uploadDocument('cnh', cnh.file)
      setCnh(prev => prev ? { ...prev, status: 'success' } : null)

      await uploadDocument('crlv', crlv.file)
      setCrlv(prev => prev ? { ...prev, status: 'success' } : null)

      setTimeout(() => {
        router.push('/driver/route')
      }, 1000)
    } catch {
      setCnh(prev => prev ? { ...prev, status: 'error' } : null)
      setCrlv(prev => prev ? { ...prev, status: 'error' } : null)
    } finally {
      setLoading(false)
    }
  }

  const removeFile = (type: 'cnh' | 'crlv') => {
    if (type === 'cnh') {
      if (cnh?.preview) URL.revokeObjectURL(cnh.preview)
      setCnh(null)
    } else {
      if (crlv?.preview) URL.revokeObjectURL(crlv.preview)
      setCrlv(null)
    }
  }

  const canContinue = cnh && crlv && !loading

  const renderUploadBox = (
    type: 'cnh' | 'crlv',
    file: UploadedFile | null,
    inputRef: React.RefObject<HTMLInputElement | null>,
    label: string,
    description: string
  ) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, type)}
      />
      
      {file ? (
        <div className="relative overflow-hidden rounded-xl border-2 border-primary">
          <Image
            src={file.preview}
            alt={label}
            width={400}
            height={200}
            className="h-40 w-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            {file.status === 'uploading' && (
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            )}
            {file.status === 'success' && (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                <Check className="h-6 w-6 text-accent-foreground" />
              </div>
            )}
            {file.status === 'pending' && (
              <Button
                variant="destructive"
                size="icon"
                onClick={() => removeFile(type)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-40 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 transition-colors hover:border-primary hover:bg-muted/50"
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Clique para fazer upload
          </span>
        </button>
      )}
    </div>
  )

  return (
    <main className="flex min-h-screen flex-col bg-background p-4">
      <div className="mx-auto w-full max-w-lg">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/driver/register">
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
          <div className="h-1 flex-1 rounded-full bg-muted" />
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Documentos</CardTitle>
            <CardDescription>
              Envie seus documentos para validação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderUploadBox(
              'cnh',
              cnh,
              cnhInputRef,
              'CNH - Carteira de Habilitação',
              'Foto da frente da CNH'
            )}

            {renderUploadBox(
              'crlv',
              crlv,
              crlvInputRef,
              'CRLV - Documento do Veículo',
              'Foto do documento do veículo'
            )}

            <Button
              onClick={handleUpload}
              disabled={!canContinue}
              className="h-12 w-full text-base font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Continuar'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
