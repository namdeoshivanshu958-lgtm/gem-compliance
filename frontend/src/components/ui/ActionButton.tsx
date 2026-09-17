import { forwardRef } from 'react'
import Button from './Button'
import type { ButtonProps } from './Button'

/**
 * Institutional Action Button conforming to government design tokens.
 * Primary (Government Blue), Secondary (Navy), Outline (White/Border).
 */
const ActionButton = forwardRef<HTMLButtonElement, ButtonProps>(function ActionButton(props, ref) {
  return <Button ref={ref} {...props} />
})

export default ActionButton
