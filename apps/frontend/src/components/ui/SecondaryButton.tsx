import { Button, ButtonProps } from '@/components/ui/button'

export function SecondaryButton({ variant: _variant, ...props }: ButtonProps) {
  return <Button variant="outline" {...props} />
}
