# Calendar selection and busy states

Calendar day filters and operation date-picker days are buttons. On Expo Web,
`aria-pressed` exposes the chosen day; `aria-selected` is not used on buttons.
On Android and iOS, `accessibilityState.selected` keeps the native selection
announcement. The Web-only pressed property is not sent to native views.

Calendar loading and occurrence conversion use `aria-busy`, supported on Web
and as a native alias of `accessibilityState.busy`. Saving also disables the
button to prevent repeated submissions. A failed request clears the busy state
and enables retry.

## Automated checks

`test/visual/accessible-calendar-states.spec.ts` exercises the real Expo Web
export with deterministic test data and a fixed date. It checks day selection,
switching and clearing a filter, reopening the date picker after changing its
selection, and busy transitions while requests are held and released. A failed
conversion checks recovery without closing the form. No screenshot baseline
needs to change for these accessibility attributes.

## Required native recipe for issue #161

**Pending:** no Android device, emulator or TalkBack is available in the cloud
environment. Browser tests do not establish a native screen-reader result.
Keep the pull request in draft until the following recipe is recorded on an
Android development build with TalkBack enabled:

1. Open Calendar. Focus a day, select it, then select another day and clear the
   filter. Check that the selected state follows the displayed filter and that
   the day label is announced once.
2. Add an operation and open its date picker. Check the currently selected day,
   choose another day, then reopen the picker. Verify that the newly chosen day
   is selected and navigation/focus still works.
3. Slow or hold the calendar API response. Verify that loading remains
   understandable, day controls stay reachable, and completion clears the busy
   state without hiding the calendar from TalkBack.
4. Convert an event into an operation. Hold the save response, verify that the
   button is busy and disabled, then return an API error. Check that the error
   is announced and retry becomes available. Retry successfully and check the
   return to the calendar.

Record the build commit, device/emulator, Android and TalkBack versions, date,
and results in the pull request before marking the recipe complete.
