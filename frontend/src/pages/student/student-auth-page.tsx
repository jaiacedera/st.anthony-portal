import { AuthPortalPage } from '../../components/auth-portal-page'

export default function StudentAuthPage() {
  return (
    <AuthPortalPage
      portalLabel="STUDENT"
      firstFieldName="studentNumber"
      firstFieldPlaceholder="Student Number"
      forgotPasswordHref="/student/forgot-password"
    />
  )
}
