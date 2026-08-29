import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { BottomBlur } from '../src/components/BottomBlur'

test('bottom blur is decorative and cannot intercept interaction', () => {
  const markup = renderToStaticMarkup(<BottomBlur />)

  expect(markup).toContain('aria-hidden="true"')
  expect(markup).toContain('bottom-blur')
  expect(markup).toContain('pointer-events-none')
  expect(markup).toContain('fixed')
  expect(markup).toContain('bottom-0')
})
