import { Button, ButtonProps } from '@/components/ui/button'

export function PrimaryButton({ variant: _variant, ...props }: ButtonProps) {
  return <Button variant="default" {...props} />
}
