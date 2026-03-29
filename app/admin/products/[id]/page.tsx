'use client';

import { ProductEditorPage } from '../editor-page';

type EditProductRouteProps = {
  params: {
    id: string;
  };
};

export default function EditProductRoute({ params }: EditProductRouteProps) {
  return <ProductEditorPage productId={params.id} />;
}
