import { ProductEditorPage } from '../editor-page';

type EditProductRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProductRoute({ params }: EditProductRouteProps) {
  const { id } = await params;
  return <ProductEditorPage productId={id} />;
}
