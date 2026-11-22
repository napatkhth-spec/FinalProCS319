import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { openShop } from '../features/auth/auth.service';
import { listCategories } from '../features/categories/category.service';
import { getMyFarmerProfile, updateMyFarmerProfile } from '../features/farmers/farmer.service';
import {
  archiveProduct,
  createProduct,
  deleteProductImage,
  listMyProducts,
  productImageUrl,
  setPrimaryProductImage,
  updateProduct,
  uploadProductImages,
  type ProductInput,
} from '../features/products/product.service';
import { useAuthStore } from '../stores/auth.store';
import type { FarmerProfile, Product } from '../types';
import { THAI_PROVINCES } from '../constants/thai-provinces';

const blankProduct: ProductInput = {
  categoryId: '',
  name: '',
  description: '',
  price: 0.01,
  stock: 0,
  unit: 'กิโลกรัม',
  sku: '',
};
const maxImageSize = 5 * 1024 * 1024;
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface PendingProductImage {
  file: File;
  preview: string;
  isPrimary: boolean;
}

export function FarmerDashboardPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setSession = useAuthStore((state) => state.setSession);
  const isFarmer = user?.roles.includes('FARMER') ?? false;
  const profileQuery = useQuery({
    queryKey: ['farmer-profile'],
    queryFn: getMyFarmerProfile,
    enabled: isFarmer,
  });
  const productsQuery = useQuery({ queryKey: ['my-products'], queryFn: listMyProducts, enabled: isFarmer });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories });
  const [shopName, setShopName] = useState('');
  const [shopDescription, setShopDescription] = useState('');
  const [farmAddress, setFarmAddress] = useState('');
  const [shopProvince, setShopProvince] = useState('');
  const [productForm, setProductForm] = useState<ProductInput>(blankProduct);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<PendingProductImage[]>([]);
  const [imageError, setImageError] = useState('');
  const [imageMessage, setImageMessage] = useState('');
  const pendingImagesRef = useRef<PendingProductImage[]>([]);
  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  }, [pendingImages]);
  useEffect(() => () => pendingImagesRef.current.forEach(({ preview }) => URL.revokeObjectURL(preview)), []);
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['my-products'] }),
      queryClient.invalidateQueries({ queryKey: ['products'] }),
    ]);
  };
  const openMutation = useMutation({
    mutationFn: () => openShop(shopName, shopProvince, shopDescription, farmAddress),
    onSuccess: async (result) => {
      if (user && accessToken)
        setSession({ ...user, roles: result.roles, farmerProfile: result.farmerProfile }, accessToken);
      await queryClient.invalidateQueries({ queryKey: ['farmer-profile'] });
    },
  });
  const profileMutation = useMutation({
    mutationFn: (profile: FarmerProfile) =>
      updateMyFarmerProfile({
        shopName: profile.shopName,
        description: profile.description ?? undefined,
        farmAddress: profile.farmAddress ?? undefined,
        province: profile.province ?? undefined,
        profileImage: profile.profileImage ?? undefined,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['farmer-profile'] }),
  });
  const productMutation = useMutation({
    mutationFn: async () => {
      let saved: Product;
      if (editingProductId) saved = await updateProduct(editingProductId, productForm);
      else {
        saved = await createProduct(productForm);
        setEditingProductId(saved.id);
      }
      if (pendingImages.length > 0) {
        const primaryIndex = pendingImages.findIndex(({ isPrimary }) => isPrimary);
        await uploadProductImages(
          saved.id,
          pendingImages.map(({ file }) => file),
          primaryIndex >= 0 ? primaryIndex : undefined,
        );
      }
      return saved;
    },
    onSuccess: async () => {
      pendingImages.forEach(({ preview }) => URL.revokeObjectURL(preview));
      setPendingImages([]);
      setImageError('');
      setImageMessage('บันทึกสินค้าและรูปภาพแล้ว');
      setEditingProductId(null);
      setProductForm(blankProduct);
      await refresh();
    },
    onError: refresh,
  });
  const archiveMutation = useMutation({ mutationFn: archiveProduct, onSuccess: refresh });
  const primaryImageMutation = useMutation({
    mutationFn: ({ productId, imageId }: { productId: string; imageId: string }) =>
      setPrimaryProductImage(productId, imageId),
    onSuccess: refresh,
  });
  const deleteImageMutation = useMutation({
    mutationFn: ({ productId, imageId }: { productId: string; imageId: string }) =>
      deleteProductImage(productId, imageId),
    onSuccess: async () => {
      setImageMessage('ลบรูปภาพแล้ว');
      await refresh();
    },
  });
  const editingProduct = productsQuery.data?.find((product) => product.id === editingProductId);

  function editProduct(product: Product) {
    setEditingProductId(product.id);
    setPendingImages([]);
    setImageError('');
    setImageMessage('');
    setProductForm({
      categoryId: product.categoryId,
      name: product.name,
      description: product.description ?? '',
      price: Number(product.price),
      stock: product.stock,
      unit: product.unit,
      sku: product.sku ?? '',
    });
  }
  function submitProduct(event: FormEvent) {
    event.preventDefault();
    productMutation.mutate();
  }
  function selectProductImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    setImageError('');
    if (files.some((file) => !allowedImageTypes.has(file.type))) {
      setImageError('รองรับเฉพาะไฟล์ JPG, PNG และ WEBP');
      return;
    }
    if (files.some((file) => file.size > maxImageSize)) {
      setImageError('รูปภาพต้องมีขนาดไม่เกิน 5 MB ต่อไฟล์');
      return;
    }
    if (pendingImages.length + files.length > 8) {
      setImageError('เลือกได้ไม่เกิน 8 รูปต่อครั้ง');
      return;
    }
    const additions = files.map((file, index) => ({
      file,
      preview: URL.createObjectURL(file),
      isPrimary: !editingProductId && pendingImages.length === 0 && index === 0,
    }));
    setPendingImages((current) => [...current, ...additions]);
  }
  function removePendingImage(preview: string) {
    URL.revokeObjectURL(preview);
    setPendingImages((current) => current.filter((image) => image.preview !== preview));
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="text-3xl font-bold">แดชบอร์ดเกษตรกร</h1>
      {!user ? (
        <p className="mt-4 text-amber-800">กรุณาเข้าสู่ระบบก่อนจัดการร้าน</p>
      ) : !isFarmer ? (
        <>
          <p className="mt-3 text-stone-600">เปิดร้านเพื่อเพิ่มบทบาทเกษตรกร โดยไม่ลบบทบาทผู้ซื้อ</p>
          <form
            className="mt-6 max-w-2xl space-y-4 rounded-xl bg-white p-5"
            onSubmit={(event) => {
              event.preventDefault();
              openMutation.mutate();
            }}
          >
            <label className="block text-sm">
              ชื่อร้าน
              <input
                required
                maxLength={120}
                value={shopName}
                onChange={(event) => setShopName(event.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              จังหวัดร้าน
              <select
                required
                value={shopProvince}
                onChange={(event) => setShopProvince(event.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              >
                <option value="">เลือกจังหวัด</option>
                {THAI_PROVINCES.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              รายละเอียดร้าน
              <textarea
                maxLength={2000}
                value={shopDescription}
                onChange={(event) => setShopDescription(event.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              ที่อยู่ฟาร์ม
              <input
                maxLength={500}
                value={farmAddress}
                onChange={(event) => setFarmAddress(event.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
            {openMutation.isSuccess && (
              <p role="status" className="text-green-800">
                เปิดร้านแล้ว สถานะ: {openMutation.data.farmerProfile.verificationStatus}
              </p>
            )}
            {openMutation.isError && (
              <p role="alert" className="text-red-700">
                {openMutation.error.message || 'เปิดร้านไม่สำเร็จ'}
              </p>
            )}
            <button
              disabled={openMutation.isPending}
              className="rounded-lg bg-green-700 px-4 py-2 text-white disabled:opacity-50"
            >
              {openMutation.isPending ? 'กำลังเปิดร้าน…' : 'เปิดร้าน'}
            </button>
          </form>
        </>
      ) : (
        <>
          {profileQuery.isPending ? (
            <p role="status" className="mt-4">
              กำลังโหลดข้อมูลร้าน…
            </p>
          ) : profileQuery.isError ? (
            <p role="alert" className="mt-4 text-red-700">
              โหลดข้อมูลร้านไม่สำเร็จ
            </p>
          ) : (
            <ProfileEditor
              profile={profileQuery.data}
              onSave={(profile) => profileMutation.mutate(profile)}
              isSaving={profileMutation.isPending}
              error={profileMutation.isError ? profileMutation.error.message : ''}
            />
          )}
          {profileQuery.data?.verificationStatus !== 'APPROVED' && (
            <div className="mt-5 rounded-lg bg-amber-50 p-4 text-amber-900">
              <p>
                สถานะร้าน {profileQuery.data?.verificationStatus ?? 'กำลังตรวจสอบ'} —
                เพิ่มหรือแก้ไขสินค้าได้เมื่อร้านได้รับอนุมัติ
              </p>
              <button
                type="button"
                disabled={profileQuery.isFetching}
                onClick={() => void profileQuery.refetch()}
                className="mt-2 underline disabled:opacity-50"
              >
                {profileQuery.isFetching ? 'กำลังตรวจสอบ…' : 'ตรวจสอบสถานะล่าสุด'}
              </button>
            </div>
          )}
          {profileQuery.data?.verificationStatus === 'APPROVED' && (
            <section className="mt-10">
              <h2 className="text-2xl font-bold">จัดการสินค้า</h2>
              <form
                onSubmit={submitProduct}
                className="mt-4 grid gap-3 rounded-xl bg-stone-50 p-5 sm:grid-cols-2"
              >
                <h3 className="sm:col-span-2 font-semibold">{editingProductId ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'}</h3>
                <label className="text-sm">
                  ชื่อสินค้า
                  <input
                    required
                    maxLength={160}
                    value={productForm.name}
                    onChange={(e) => setProductForm((v) => ({ ...v, name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  หมวดหมู่
                  <select
                    required
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm((v) => ({ ...v, categoryId: e.target.value }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  >
                    <option value="">เลือกหมวดหมู่</option>
                    {categoriesQuery.data?.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  ราคา
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductForm((v) => ({ ...v, price: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  จำนวนคงเหลือ
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={productForm.stock}
                    onChange={(e) => setProductForm((v) => ({ ...v, stock: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  หน่วย
                  <input
                    required
                    maxLength={32}
                    value={productForm.unit}
                    onChange={(e) => setProductForm((v) => ({ ...v, unit: e.target.value }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  SKU (ไม่บังคับ)
                  <input
                    maxLength={64}
                    value={productForm.sku ?? ''}
                    onChange={(e) => setProductForm((v) => ({ ...v, sku: e.target.value }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  รายละเอียด
                  <textarea
                    maxLength={5000}
                    value={productForm.description ?? ''}
                    onChange={(e) => setProductForm((v) => ({ ...v, description: e.target.value }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  รูปสินค้า (JPG, PNG, WEBP ไม่เกิน 5 MB ต่อรูป)
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={selectProductImages}
                    className="mt-1 block w-full"
                  />
                </label>
                {imageError && (
                  <p role="alert" className="sm:col-span-2 text-red-700">
                    {imageError}
                  </p>
                )}
                {imageMessage && (
                  <p role="status" className="sm:col-span-2 text-green-800">
                    {imageMessage}
                  </p>
                )}
                {pendingImages.map((image) => (
                  <div key={image.preview} className="flex items-center gap-3 rounded-lg border bg-white p-2">
                    <img
                      src={image.preview}
                      alt={image.file.name}
                      className="h-16 w-20 rounded object-cover"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{image.file.name}</span>
                    <label className="text-xs">
                      <input
                        type="radio"
                        name="new-primary-image"
                        checked={image.isPrimary}
                        onChange={() =>
                          setPendingImages((current) =>
                            current.map((item) => ({ ...item, isPrimary: item.preview === image.preview })),
                          )
                        }
                      />{' '}
                      รูปหลัก
                    </label>
                    <button
                      type="button"
                      onClick={() => removePendingImage(image.preview)}
                      className="text-sm text-red-700"
                    >
                      นำออก
                    </button>
                  </div>
                ))}
                {editingProductId && (
                  <div className="sm:col-span-2">
                    <h4 className="mb-2 text-sm font-semibold">รูปที่บันทึกแล้ว</h4>
                    {productsQuery.isPending ? (
                      <p role="status" className="text-sm">
                        กำลังโหลดรูปสินค้า…
                      </p>
                    ) : (editingProduct?.images?.length ?? 0) === 0 ? (
                      <p className="text-sm text-stone-600">สินค้านี้ยังไม่มีรูป</p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {editingProduct?.images?.map((image) => (
                          <div key={image.id} className="w-36 rounded-lg border bg-white p-2">
                            <img
                              src={productImageUrl(image)}
                              alt="รูปสินค้าที่บันทึกแล้ว"
                              className="aspect-square w-full rounded object-cover"
                            />
                            <button
                              type="button"
                              disabled={primaryImageMutation.isPending}
                              onClick={() =>
                                primaryImageMutation.mutate({
                                  productId: editingProduct.id,
                                  imageId: image.id,
                                })
                              }
                              className="mt-2 text-xs text-green-800 underline"
                            >
                              {image.isPrimary ? 'รูปหลัก' : 'ตั้งเป็นรูปหลัก'}
                            </button>
                            <button
                              type="button"
                              disabled={deleteImageMutation.isPending}
                              onClick={() => {
                                if (window.confirm('ยืนยันลบรูปสินค้านี้หรือไม่?'))
                                  deleteImageMutation.mutate({
                                    productId: editingProduct.id,
                                    imageId: image.id,
                                  });
                              }}
                              className="ml-2 text-xs text-red-700 underline"
                            >
                              ลบรูป
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {(primaryImageMutation.isError || deleteImageMutation.isError) && (
                  <p role="alert" className="sm:col-span-2 text-red-700">
                    {primaryImageMutation.error?.message ||
                      deleteImageMutation.error?.message ||
                      'จัดการรูปสินค้าไม่สำเร็จ'}
                  </p>
                )}
                {(productMutation.isError || archiveMutation.isError) && (
                  <p role="alert" className="sm:col-span-2 text-red-700">
                    {productMutation.error?.message || archiveMutation.error?.message || 'ดำเนินการไม่สำเร็จ'}
                  </p>
                )}
                {productMutation.isPending && pendingImages.length > 0 && (
                  <p role="status" className="sm:col-span-2 text-green-800">
                    กำลังบันทึกสินค้าและอัปโหลดรูปภาพ…
                  </p>
                )}
                <div className="flex gap-3 sm:col-span-2">
                  <button
                    disabled={productMutation.isPending}
                    className="rounded-lg bg-green-700 px-4 py-2 text-white disabled:opacity-50"
                  >
                    {productMutation.isPending
                      ? 'กำลังบันทึกและอัปโหลด…'
                      : editingProductId
                        ? 'บันทึกสินค้า'
                        : 'เพิ่มสินค้า'}
                  </button>
                  {editingProductId && (
                    <button
                      type="button"
                      onClick={() => {
                        pendingImages.forEach(({ preview }) => URL.revokeObjectURL(preview));
                        setPendingImages([]);
                        setEditingProductId(null);
                        setProductForm(blankProduct);
                        setImageMessage('');
                        setImageError('');
                      }}
                      className="rounded-lg border px-4 py-2"
                    >
                      ยกเลิก
                    </button>
                  )}
                </div>
              </form>
              {productsQuery.isPending ? (
                <p role="status" className="mt-5">
                  กำลังโหลดสินค้า…
                </p>
              ) : productsQuery.isError ? (
                <p role="alert" className="mt-5 text-red-700">
                  โหลดสินค้าไม่สำเร็จ
                </p>
              ) : productsQuery.data.length === 0 ? (
                <p className="mt-5 text-stone-600">ยังไม่มีสินค้า</p>
              ) : (
                <div className="mt-5 divide-y rounded-xl border bg-white">
                  {productsQuery.data.map((product) => (
                    <div key={product.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div>
                        <strong>{product.name}</strong>
                        <p className="text-sm text-stone-600">
                          ฿{Number(product.price).toFixed(2)} / {product.unit} · คงเหลือ {product.stock} ·{' '}
                          {product.status}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => editProduct(product)}
                          className="text-sm text-green-800 underline"
                        >
                          แก้ไข
                        </button>
                        {product.status !== 'INACTIVE' && (
                          <button
                            disabled={archiveMutation.isPending}
                            onClick={() => archiveMutation.mutate(product.id)}
                            className="text-sm text-red-700 underline"
                          >
                            เก็บเข้าคลัง
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </section>
  );
}

function ProfileEditor({
  profile,
  onSave,
  isSaving,
  error,
}: {
  profile: FarmerProfile;
  onSave: (profile: FarmerProfile) => void;
  isSaving: boolean;
  error: string;
}) {
  const [value, setValue] = useState(profile);
  return (
    <form
      className="mt-5 grid gap-4 rounded-xl border border-stone-200 bg-white p-5 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(value);
      }}
    >
      <h2 className="sm:col-span-2 text-xl font-semibold">ข้อมูลร้าน · {profile.verificationStatus}</h2>
      <label className="text-sm">
        ชื่อร้าน
        <input
          required
          maxLength={120}
          value={value.shopName}
          onChange={(e) => setValue((v) => ({ ...v, shopName: e.target.value }))}
          className="mt-1 w-full rounded-lg border px-3 py-2"
        />
      </label>
      <label className="text-sm">
        จังหวัดร้าน
        <select
          required
          value={value.province ?? ''}
          onChange={(e) => setValue((v) => ({ ...v, province: e.target.value || null }))}
          className="mt-1 w-full rounded-lg border px-3 py-2"
        >
          <option value="">เลือกจังหวัด</option>
          {THAI_PROVINCES.map((province) => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        ที่อยู่ฟาร์ม
        <input
          maxLength={500}
          value={value.farmAddress ?? ''}
          onChange={(e) => setValue((v) => ({ ...v, farmAddress: e.target.value }))}
          className="mt-1 w-full rounded-lg border px-3 py-2"
        />
      </label>
      <label className="text-sm sm:col-span-2">
        รายละเอียดร้าน
        <textarea
          maxLength={2000}
          value={value.description ?? ''}
          onChange={(e) => setValue((v) => ({ ...v, description: e.target.value }))}
          className="mt-1 w-full rounded-lg border px-3 py-2"
        />
      </label>
      {error && (
        <p role="alert" className="sm:col-span-2 text-red-700">
          {error}
        </p>
      )}
      <button
        disabled={isSaving}
        className="w-fit rounded-lg border border-green-700 px-4 py-2 text-green-800 disabled:opacity-50"
      >
        {isSaving ? 'กำลังบันทึก…' : 'บันทึกข้อมูลร้าน'}
      </button>
    </form>
  );
}
