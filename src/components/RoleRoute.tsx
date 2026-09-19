import { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UserRole, useUserRole } from "@/hooks/useUserRole";

interface RoleRouteProps {
  allowedRoles: UserRole[];
  children?: ReactNode;
  redirectTo?: string;
}

const RoleCheck = ({ allowedRoles, children, redirectTo = "/" }: RoleRouteProps) => {
  const { roles, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Checking your permissions">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  if (!allowedRoles.some((role) => roles.includes(role))) {
    return <Navigate to={redirectTo} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const RoleRoute = (props: RoleRouteProps) => (
  <ProtectedRoute>
    <RoleCheck {...props} />
  </ProtectedRoute>
);
