import ForoTema from "@/components/ForoTema";

export default function TemaPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return <p className="text-sm text-neutral-500">—</p>;
  }
  return <ForoTema temaId={id} />;
}
