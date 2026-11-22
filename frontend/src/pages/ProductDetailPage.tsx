import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createReview,
  deleteReview,
  listProductReviews,
  updateReview,
} from '../features/reviews/review.service';
import { getProduct, productImageUrl } from '../features/products/product.service';
import { useAuthStore } from '../stores/auth.store';
import { useCartStore } from '../stores/cart.store';

export function ProductDetailPage() {
  const { productId = '' } = useParams();
  const user = useAuthStore((state) => state.user);
  const addItem = useCartStore((state) => state.addItem);
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [cartMessage, setCartMessage] = useState('');
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const cartQuantity = useCartStore(
    (state) => state.items.find((cartItem) => cartItem.product.id === productId)?.quantity ?? 0,
  );
  const product = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId),
    enabled: Boolean(productId),
  });
  const reviews = useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => listProductReviews(productId),
    enabled: Boolean(productId),
  });
  const createMutation = useMutation({
    mutationFn: () => createReview({ productId, rating, comment: comment || undefined }),
    onSuccess: async () => {
      setComment('');
      await queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
    },
  });
  const updateMutation = useMutation({
    mutationFn: () => updateReview(editingReviewId!, { rating, comment }),
    onSuccess: async () => {
      setEditingReviewId(null);
      setComment('');
      await queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteReview,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews', productId] }),
  });

  if (product.isPending)
    return (
      <p role="status" className="mx-auto max-w-6xl px-5 py-12">
        กำลังโหลดสินค้า…
      </p>
    );
  if (product.isError)
    return (
      <section className="mx-auto max-w-6xl px-5 py-12">
        <p role="alert" className="text-red-700">
          {product.error.message || 'โหลดสินค้าไม่สำเร็จ'}
        </p>
        <Link to="/products" className="mt-3 inline-block underline">
          กลับไปหน้าสินค้า
        </Link>
      </section>
    );
  const item = product.data;
  const mainImage =
    item.images?.find((image) => image.id === selectedImageId) ??
    item.images?.find((image) => image.isPrimary) ??
    item.images?.[0];

  return (
    <section className="mx-auto max-w-6xl px-5 py-12">
      <Link to="/products" className="text-sm text-green-800 underline">
        ← กลับไปหน้าสินค้า
      </Link>
      <div className="mt-5 grid gap-8 md:grid-cols-2">
        <div>
          <div className="flex min-h-72 items-center justify-center rounded-2xl bg-green-50 text-green-800">
            {mainImage ? (
              <img
                src={productImageUrl(mainImage)}
                alt={item.name}
                className="max-h-96 max-w-full rounded-xl object-contain"
              />
            ) : (
              <span>ไม่มีรูปสินค้า</span>
            )}
          </div>
          {(item.images?.length ?? 0) > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.images?.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setSelectedImageId(image.id)}
                  aria-label={`แสดงรูปที่ ${index + 1}`}
                  aria-pressed={mainImage?.id === image.id}
                  className={`rounded-lg border-2 p-1 ${mainImage?.id === image.id ? 'border-green-700' : 'border-transparent'}`}
                >
                  <img
                    src={productImageUrl(image)}
                    alt={`${item.name} รูปที่ ${index + 1}`}
                    className="h-16 w-20 rounded object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm text-green-800">{item.category?.name ?? 'สินค้าเกษตร'}</p>
          <h1 className="mt-2 text-3xl font-bold">{item.name}</h1>
          <p className="mt-4 whitespace-pre-wrap text-stone-600">{item.description || 'ไม่มีรายละเอียดสินค้า'}</p>
          <p className="mt-5 text-2xl font-bold">
            ฿{Number(item.price).toFixed(2)} <span className="text-base font-normal">/ {item.unit}</span>
          </p>
          <p className="mt-2 text-sm text-stone-600">
            ร้าน {item.farmer?.shopName ?? 'เกษตรกร'}
            {item.farmer?.province ? ` · ${item.farmer.province}` : ''} · คงเหลือ {item.stock}
          </p>
          <button
            type="button"
            disabled={item.stock < 1 || item.status !== 'ACTIVE' || cartQuantity >= item.stock}
            onClick={() =>
              setCartMessage(
                addItem(item) ? `เพิ่ม ${item.name} ลงตะกร้าแล้ว` : 'เพิ่มสินค้าไม่สำเร็จ สินค้าอาจหมดหรือเกินจำนวนคงเหลือ',
              )
            }
            className="mt-6 rounded-lg bg-green-700 px-5 py-3 font-semibold text-white disabled:bg-stone-300"
          >
            {item.stock < 1 || item.status !== 'ACTIVE'
              ? 'สินค้าหมด'
              : cartQuantity >= item.stock
                ? 'เพิ่มครบจำนวนคงเหลือแล้ว'
                : 'เพิ่มลงตะกร้า'}
          </button>
          {cartMessage && (
            <p role="status" className="mt-2 text-sm text-green-800">
              {cartMessage}
            </p>
          )}
        </div>
      </div>
      <section className="mt-12 border-t border-stone-200 pt-8">
        <h2 className="text-2xl font-bold">รีวิวสินค้า</h2>
        {reviews.isPending ? (
          <p role="status" className="mt-4">
            กำลังโหลดรีวิว…
          </p>
        ) : reviews.isError ? (
          <p role="alert" className="mt-4 text-red-700">
            โหลดรีวิวไม่สำเร็จ
          </p>
        ) : reviews.data.length === 0 ? (
          <p className="mt-4 text-stone-600">ยังไม่มีรีวิว</p>
        ) : (
          <div className="mt-4 space-y-3">
            {reviews.data.map((review) => (
              <article key={review.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <strong>{review.user.fullName}</strong>
                  <span aria-label={`${review.rating} จาก 5 ดาว`}>
                    {'★'.repeat(review.rating)}
                    {'☆'.repeat(5 - review.rating)}
                  </span>
                </div>
                {review.comment && (
                  <p className="mt-2 whitespace-pre-wrap text-stone-700">{review.comment}</p>
                )}
              </article>
            ))}
          </div>
        )}
        {reviews.data?.some((review) => review.userId === user?.id) && user?.roles.includes('BUYER') && (
          <p className="mt-3 text-xs text-stone-500">คุณมีรีวิวสินค้านี้แล้ว สามารถแก้ไขหรือลบรีวิวเดิมได้</p>
        )}
        {user?.roles.includes('BUYER') && !reviews.data?.some((review) => review.userId === user.id) ? (
          <form
            className="mt-6 max-w-xl space-y-3 rounded-xl bg-stone-50 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <h3 className="font-semibold">เขียนรีวิว</h3>
            <label className="block text-sm">
              คะแนน
              <select
                value={rating}
                onChange={(event) => setRating(Number(event.target.value))}
                className="mt-1 block rounded-lg border border-stone-300 px-3 py-2"
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} ดาว
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              ความคิดเห็น
              <textarea
                maxLength={2000}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>
            {createMutation.isError && (
              <p role="alert" className="text-sm text-red-700">
                {createMutation.error.message || 'ส่งรีวิวไม่สำเร็จ'}
              </p>
            )}
            <button
              disabled={createMutation.isPending}
              className="rounded-lg bg-green-700 px-4 py-2 text-white disabled:opacity-50"
            >
              {createMutation.isPending ? 'กำลังส่ง…' : 'ส่งรีวิว'}
            </button>
          </form>
        ) : null}
        {user?.roles.includes('BUYER') && editingReviewId && (
          <form
            className="mt-6 max-w-xl space-y-3 rounded-xl bg-stone-50 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              updateMutation.mutate();
            }}
          >
            <h3 className="font-semibold">แก้ไขรีวิว</h3>
            <label className="block text-sm">
              คะแนน
              <select
                value={rating}
                onChange={(event) => setRating(Number(event.target.value))}
                className="mt-1 block rounded-lg border border-stone-300 px-3 py-2"
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} ดาว
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              ความคิดเห็น
              <textarea
                maxLength={2000}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>
            {updateMutation.isError && (
              <p role="alert" className="text-sm text-red-700">
                แก้ไขรีวิวไม่สำเร็จ
              </p>
            )}
            <div className="flex gap-3">
              <button
                disabled={updateMutation.isPending}
                className="rounded-lg bg-green-700 px-4 py-2 text-white"
              >
                บันทึกรีวิว
              </button>
              <button
                type="button"
                onClick={() => setEditingReviewId(null)}
                className="rounded-lg border px-4 py-2"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        )}
        {user?.roles.includes('BUYER') &&
          reviews.data
            ?.filter((review) => review.userId === user.id)
            .map((review) => (
              <div key={`own-review-${review.id}`} className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingReviewId(review.id);
                    setRating(review.rating);
                    setComment(review.comment ?? '');
                  }}
                  className="text-sm text-green-800 underline"
                >
                  แก้ไขรีวิวของฉัน
                </button>
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(review.id)}
                  className="text-sm text-red-700 underline"
                >
                  ลบรีวิวของฉัน
                </button>
              </div>
            ))}
        {(deleteMutation.isError || createMutation.isError) && (
          <p role="alert" className="mt-3 text-red-700">
            {deleteMutation.error?.message || createMutation.error?.message}
          </p>
        )}
      </section>
    </section>
  );
}
