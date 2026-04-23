'use client'

import { useId, useState } from 'react'
import { IconEye, IconEyeOff } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type PasswordInputDictionary = {
  auth: {
    hidePassword: string
    showPassword: string
  }
}

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, 'type'> & {
  inputClassName?: string
  t: PasswordInputDictionary
}

export default function PasswordInput({
  className,
  inputClassName,
  id,
  t,
  ...props
}: PasswordInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const [visible, setVisible] = useState(false)

  return (
    <div className={cn('relative', className)}>
      <Input
        {...props}
        id={inputId}
        type={visible ? 'text' : 'password'}
        className={cn('pr-24', inputClassName)}
      />
      <div className="absolute inset-y-0 right-1 flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-foreground/65 hover:bg-transparent hover:text-campus-primary active:translate-y-0"
          aria-controls={inputId}
          aria-label={visible ? t.auth.hidePassword : t.auth.showPassword}
          aria-pressed={visible}
          title={visible ? t.auth.hidePassword : t.auth.showPassword}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <IconEyeOff size={16} /> : <IconEye size={16} />}
        </Button>
      </div>
    </div>
  )
}
