import { Navigate, useParams } from "react-router-dom";

export default function RedirectToListing() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/listing/${id}`} replace />;
}
