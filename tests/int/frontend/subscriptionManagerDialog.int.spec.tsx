import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SubscriptionManagerDialog } from '@/components/subscription/SubscriptionManagerDialog'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function SubscriptionDialogHarness() {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button type="button" data-testid="dialog-trigger" onClick={() => setOpen(true)}>
        Open subscriptions
      </button>
      <button type="button" data-testid="background-action">
        Background action
      </button>
      <SubscriptionManagerDialog
        closeLabel="Close"
        items={[
          { id: 1, name: 'Alpha Campus', slug: 'alpha-campus', subscribed: false },
          { id: 2, name: 'Beta Campus', slug: 'beta-campus', subscribed: true },
        ]}
        onOpenChange={setOpen}
        onToggle={vi.fn()}
        open={open}
        subscribeLabel="Subscribe"
        title="Add Channel"
        unsubscribeLabel="Unsubscribe"
      />
    </div>
  )
}

describe('SubscriptionManagerDialog accessibility', () => {
  it('initially focuses the dialog, traps Tab, and restores focus on close', async () => {
    render(<SubscriptionDialogHarness />)

    const trigger = screen.getByTestId('dialog-trigger')
    trigger.focus()
    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Add Channel' })
    const closeButton = within(dialog).getByRole('button', { name: 'Close' })
    await waitFor(() => expect(document.activeElement).toBe(closeButton))

    fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true })

    const dialogButtons = Array.from(dialog.querySelectorAll('button'))
    expect(document.activeElement).toBe(dialogButtons[dialogButtons.length - 1])
    expect(document.activeElement).not.toBe(screen.getByTestId('background-action'))

    fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add Channel' })).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })
})
