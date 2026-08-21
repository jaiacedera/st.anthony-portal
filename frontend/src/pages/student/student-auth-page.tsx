import { AuthPortalPage } from '../../components/auth-portal-page'

export default function StudentAuthPage() {
  return (
    <AuthPortalPage
      portalLabel="STUDENT"
      firstFieldName="email"
      firstFieldPlaceholder="Email"
      forgotPasswordHref="/student/forgot-password"
    />
  )
}
