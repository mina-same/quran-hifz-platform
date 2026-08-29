/**
 * The admin portal's own route for the Quran-plan form.
 *
 * The form itself is identical to the teacher's, but the route has to exist
 * *inside the admin Tabs navigator*: pushing `/(portal)/teacher/plan-form`
 * from an admin screen asks expo-router for a route this navigator does not
 * own, which sends the root `<Stack.Protected>` guard into a re-render loop
 * ("Maximum update depth exceeded") rather than a clean navigation failure.
 */
export { default } from '../teacher/plan-form';
