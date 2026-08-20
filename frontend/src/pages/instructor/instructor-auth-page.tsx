import { AuthPortalPage } from '../../components/auth-portal-page'

export default function InstructorAuthPage() {
  return (
    <AuthPortalPage
      portalLabel="INSTRUCTOR"
      firstFieldName="username"
      firstFieldPlaceholder="Username"
      forgotPasswordHref="/instructor/forgot-password"
    />
  )
}
