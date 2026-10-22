import { redirect } from "next/navigation";

/** El portal ahora es para cualquier usuario con sesion: vive en /publicar. */
export default function AdminRedirect() {
  redirect("/publicar");
}
