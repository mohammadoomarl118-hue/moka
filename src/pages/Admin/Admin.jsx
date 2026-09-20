import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import './Admin.css'

const emptyForm = {
  name: '',
  description: '',
  category: 'hot',
  price: '',
  image_url: '',
  active: true,
}

const categories = [
  {
    value: 'hot',
    label: 'ساخن',
  },
  {
    value: 'cold',
    label: 'بارد',
  },
  {
    value: 'dessert',
    label: 'حلويات',
  },
]

const orderStatuses = [
  {
    value: 'new',
    label: 'جديد',
  },
  {
    value: 'confirmed',
    label: 'تم التأكيد',
  },
  {
    value: 'preparing',
    label: 'قيد التحضير',
  },
  {
    value: 'ready',
    label: 'جاهز',
  },
  {
    value: 'completed',
    label: 'مكتمل',
  },
  {
    value: 'cancelled',
    label: 'ملغي',
  },
]

const paymentLabels = {
  cash: 'الدفع عند الاستلام',
  card: 'Visa / بطاقة',
}

const statusLabels = {
  new: 'جديد',
  confirmed: 'تم التأكيد',
  preparing: 'قيد التحضير',
  ready: 'جاهز',
  completed: 'مكتمل',
  cancelled: 'ملغي',
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

function createSafeFileId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 12)}`
}

function getSafeExtension(file) {
  const fileName = file?.name || ''

  const extension = fileName
    .split('.')
    .pop()
    ?.toLowerCase()

  if (
    extension &&
    ['jpg', 'jpeg', 'png', 'webp'].includes(extension)
  ) {
    return extension
  }

  if (file?.type === 'image/png') {
    return 'png'
  }

  if (file?.type === 'image/webp') {
    return 'webp'
  }

  if (file?.type === 'image/jpeg') {
    return 'jpg'
  }

  return 'jpg'
}

export default function Admin() {
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])

  const [form, setForm] = useState(emptyForm)

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')

  const [editingId, setEditingId] = useState(null)

  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(true)

  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [updatingOrderId, setUpdatingOrderId] = useState(null)

  

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  useEffect(() => {
    loadProducts()
    loadOrders()

    const ordersChannel = supabase
      .channel('moka-admin-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          loadOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ordersChannel)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  async function loadProducts() {
    setLoading(true)
    setError('')

    try {
      const {
        data,
        error: productsError,
      } = await supabase
        .from('products')
        .select('*')
        .order('created_at', {
          ascending: false,
        })

      if (productsError) {
        throw productsError
      }

      setProducts(data || [])
    } catch (err) {
      console.error('LOAD PRODUCTS ERROR:', err)

      setError(
        err?.message || 'تعذر تحميل المنتجات'
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadOrders() {
    setOrdersLoading(true)

    try {
      const {
        data: orderData,
        error: ordersError,
      } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', {
          ascending: false,
        })

      if (ordersError) {
        throw ordersError
      }

      const orderIds = (orderData || []).map(
        (order) => order.id
      )

      let itemsData = []

      if (orderIds.length > 0) {
        const {
          data,
          error: itemsError,
        } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds)
          .order('created_at', {
            ascending: true,
          })

        if (itemsError) {
          throw itemsError
        }

        itemsData = data || []
      }

      const itemsByOrder = {}

      itemsData.forEach((item) => {
        if (!itemsByOrder[item.order_id]) {
          itemsByOrder[item.order_id] = []
        }

        itemsByOrder[item.order_id].push(item)
      })

      const preparedOrders = (orderData || []).map(
        (order) => ({
          ...order,
          items: itemsByOrder[order.id] || [],
        })
      )

      setOrders(preparedOrders)
    } catch (err) {
      console.error('LOAD ORDERS ERROR:', err)

      setError(
        err?.message || 'تعذر تحميل الطلبات'
      )
    } finally {
      setOrdersLoading(false)
    }
  }

  async function updateOrderStatus(orderId, status) {
    if (!orderId || !status) {
      return
    }

    setUpdatingOrderId(orderId)
    setError('')
    setMessage('')

    try {
      const {
        error: updateError,
      } = await supabase
        .from('orders')
        .update({
          status,
        })
        .eq('id', orderId)

      if (updateError) {
        throw updateError
      }

      // تحديث الطلب مباشرة في الواجهة
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status,
              }
            : order
        )
      )

      if (status === 'completed') {
        setMessage(
          'تم إنهاء الطلب ونقله إلى الطلبات التي تمت'
        )
      } else {
        setMessage('تم تحديث حالة الطلب')
      }
    } catch (err) {
      console.error(
        'UPDATE ORDER STATUS ERROR:',
        err
      )

      setError(
        err?.message ||
          'تعذر تحديث حالة الطلب'
      )
    } finally {
      setUpdatingOrderId(null)
    }
  }

  async function hideCompletedOrder(orderId) {
  if (!orderId) {
    return
  }

  setError('')
  setMessage('')

  try {
    const {
      error: updateError,
    } = await supabase
      .from('orders')
      .update({
        hidden: true,
      })
      .eq('id', orderId)

    if (updateError) {
      throw updateError
    }

    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              hidden: true,
            }
          : order
      )
    )

    setMessage('تم إخفاء الطلب المكتمل')
  } catch (err) {
    console.error(
      'HIDE ORDER ERROR:',
      err
    )

    setError(
      err?.message ||
        'تعذر إخفاء الطلب'
    )
  }
}

  function formatOrderDate(date) {
    if (!date) {
      return '—'
    }

    try {
      return new Intl.DateTimeFormat('ar-PS', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(date))
    } catch {
      return date
    }
  }

  function getOrderStatusClass(status) {
    return `order-status order-status-${status || 'new'}`
  }

  function handleChange(event) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target

    setForm((current) => ({
      ...current,
      [name]:
        type === 'checkbox'
          ? checked
          : value,
    }))
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setError('')
    setMessage('')

    const isImage =
      file.type?.startsWith('image/') ||
      /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(
        file.name || ''
      )

    if (!isImage) {
      setError('اختر ملف صورة فقط')
      event.target.value = ''
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError(
        'حجم الصورة يجب أن يكون أقل من 5MB'
      )
      event.target.value = ''
      return
    }

    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }

    try {
      const previewUrl =
        URL.createObjectURL(file)

      setImageFile(file)
      setImagePreview(previewUrl)
    } catch (previewError) {
      console.error(
        'IMAGE PREVIEW ERROR:',
        previewError
      )

      setImageFile(file)
      setImagePreview('')

      setError(
        'تم اختيار الصورة، لكن تعذر إنشاء المعاينة'
      )
    }

    event.target.value = ''
  }

  function resetForm() {
    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }

    setForm(emptyForm)
    setImageFile(null)
    setImagePreview('')
    setEditingId(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
  }

  async function uploadImage(file) {
    if (!file) {
      return null
    }

    const isImage =
      file.type?.startsWith('image/') ||
      /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(
        file.name || ''
      )

    if (!isImage) {
      throw new Error(
        'الملف المختار ليس صورة'
      )
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error(
        'حجم الصورة يجب أن يكون أقل من 5MB'
      )
    }

    const safeId = createSafeFileId()
    const extension =
      getSafeExtension(file)

    const fileName =
      `${safeId}.${extension}`

    const filePath =
      `products/${fileName}`

    console.log(
      'Uploading image:',
      filePath
    )

    const contentType =
      file.type?.startsWith('image/')
        ? file.type
        : 'image/jpeg'

    const {
      data: uploadData,
      error: uploadError,
    } = await supabase.storage
      .from('product-images')
      .upload(
        filePath,
        file,
        {
          cacheControl: '3600',
          upsert: false,
          contentType,
        }
      )

    if (uploadError) {
      console.error(
        'SUPABASE STORAGE UPLOAD ERROR:',
        uploadError
      )

      throw new Error(
        `فشل رفع الصورة: ${uploadError.message}`
      )
    }

    if (!uploadData?.path) {
      throw new Error(
        'تم رفع الصورة ولكن لم يتم إرجاع مسارها'
      )
    }

    const {
      data: publicData,
    } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath)

    const publicUrl =
      publicData?.publicUrl

    if (!publicUrl) {
      throw new Error(
        'تعذر الحصول على رابط الصورة'
      )
    }

    console.log(
      'Image uploaded successfully:',
      publicUrl
    )

    return {
      publicUrl,
      path: filePath,
    }
  }

  function getStoragePath(imageUrl) {
    if (!imageUrl) {
      return null
    }

    const marker =
      '/storage/v1/object/public/product-images/'

    const index =
      imageUrl.indexOf(marker)

    if (index === -1) {
      return null
    }

    return decodeURIComponent(
      imageUrl.slice(
        index + marker.length
      )
    )
  }

  async function deleteImage(imageUrl) {
    const path =
      getStoragePath(imageUrl)

    if (!path) {
      return
    }

    const {
      error: storageError,
    } = await supabase.storage
      .from('product-images')
      .remove([path])

    if (storageError) {
      console.error(
        'IMAGE DELETE ERROR:',
        storageError
      )
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setMessage('')
    setError('')

    const productName =
      form.name.trim()

    if (!productName) {
      setError('اكتب اسم المنتج')
      return
    }

    const numericPrice =
      Number(form.price)

    if (
      form.price === '' ||
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {
      setError('أدخل سعرًا صحيحًا')
      return
    }

    if (
      !['hot', 'cold', 'dessert'].includes(
        form.category
      )
    ) {
      setError('اختر تصنيفًا صحيحًا')
      return
    }

    setSaving(true)

    try {
      if (editingId) {
        const oldProduct =
          products.find(
            (product) =>
              product.id === editingId
          )

        let imageUrl =
          form.image_url || null

        if (imageFile) {
          const uploaded =
            await uploadImage(imageFile)

          imageUrl =
            uploaded.publicUrl

          const {
            error: updateError,
          } = await supabase
            .from('products')
            .update({
              name: productName,
              description:
                form.description.trim(),
              category:
                form.category,
              price:
                numericPrice,
              image_url:
                imageUrl,
              active:
                Boolean(form.active),
            })
            .eq(
              'id',
              editingId
            )

          if (updateError) {
            await supabase.storage
              .from('product-images')
              .remove([
                uploaded.path,
              ])

            throw updateError
          }

          if (
            oldProduct?.image_url &&
            oldProduct.image_url !== imageUrl
          ) {
            await deleteImage(
              oldProduct.image_url
            )
          }
        } else {
          const {
            error: updateError,
          } = await supabase
            .from('products')
            .update({
              name: productName,
              description:
                form.description.trim(),
              category:
                form.category,
              price:
                numericPrice,
              image_url:
                imageUrl,
              active:
                Boolean(form.active),
            })
            .eq(
              'id',
              editingId
            )

          if (updateError) {
            throw updateError
          }
        }

        setMessage(
          'تم تعديل المنتج بنجاح'
        )
      } else {
        let imageUrl = null
        let uploadedImagePath = null

        if (imageFile) {
          const uploaded =
            await uploadImage(imageFile)

          imageUrl =
            uploaded.publicUrl

          uploadedImagePath =
            uploaded.path
        }

        try {
          const {
            data: createdProduct,
            error: insertError,
          } = await supabase
            .from('products')
            .insert({
              name: productName,
              description:
                form.description.trim(),
              category:
                form.category,
              price:
                numericPrice,
              image_url:
                imageUrl,
              active:
                Boolean(form.active),
            })
            .select()
            .single()

          if (insertError) {
            throw insertError
          }

          console.log(
            'PRODUCT CREATED:',
            createdProduct
          )
        } catch (productError) {
          if (uploadedImagePath) {
            await supabase.storage
              .from('product-images')
              .remove([
                uploadedImagePath,
              ])
          }

          throw productError
        }

        setMessage(
          imageFile
            ? 'تمت إضافة المنتج والصورة بنجاح'
            : 'تمت إضافة المنتج بنجاح'
        )
      }

      resetForm()
      await loadProducts()
    } catch (err) {
      console.error(
        'SAVE PRODUCT ERROR:',
        err
      )

      setError(
        err?.message ||
          err?.details ||
          err?.hint ||
          'حدث خطأ أثناء حفظ المنتج'
      )
    } finally {
      setSaving(false)
    }
  }

  function startEdit(product) {
    setMessage('')
    setError('')

    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }

    setEditingId(product.id)

    setForm({
      name:
        product.name || '',

      description:
        product.description || '',

      category:
        product.category || 'hot',

      price:
        product.price ?? '',

      image_url:
        product.image_url || '',

      active:
        product.active ?? true,
    })

    setImageFile(null)

    setImagePreview(
      product.image_url || ''
    )

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function deleteProduct(product) {
    const confirmed =
      window.confirm(
        `هل تريد حذف "${product.name}"؟`
      )

    if (!confirmed) {
      return
    }

    setDeletingId(product.id)
    setError('')
    setMessage('')

    try {
      const {
        error: deleteError,
      } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)

      if (deleteError) {
        throw deleteError
      }

      if (product.image_url) {
        await deleteImage(
          product.image_url
        )
      }

      if (editingId === product.id) {
        resetForm()
      }

      setMessage(
        'تم حذف المنتج بنجاح'
      )

      await loadProducts()
    } catch (err) {
      console.error(
        'DELETE PRODUCT ERROR:',
        err
      )

      setError(
        err?.message ||
          'تعذر حذف المنتج'
      )
    } finally {
      setDeletingId(null)
    }
  }

  async function toggleActive(product) {
    setTogglingId(product.id)
    setError('')
    setMessage('')

    try {
      const {
        error: updateError,
      } = await supabase
        .from('products')
        .update({
          active: !product.active,
        })
        .eq('id', product.id)

      if (updateError) {
        throw updateError
      }

      setMessage(
        product.active
          ? 'تم إخفاء المنتج'
          : 'تم إظهار المنتج'
      )

      await loadProducts()
    } catch (err) {
      console.error(
        'TOGGLE PRODUCT ERROR:',
        err
      )

      setError(
        err?.message ||
          'تعذر تغيير حالة المنتج'
      )
    } finally {
      setTogglingId(null)
    }
  }

  // الطلبات الحالية
  const currentOrders =
    orders.filter(
      (order) =>
        order.status !== 'completed'
    )

  // الطلبات المكتملة وغير المخفية
const completedOrders =
  orders.filter(
    (order) =>
      order.status === 'completed' &&
      !order.hidden
  )

  // العدد الحقيقي لكل الطلبات المكتملة
  const completedOrdersCount =
    orders.filter(
      (order) =>
        order.status === 'completed'
    ).length

  const newOrdersCount =
    currentOrders.filter(
      (order) =>
        order.status === 'new'
    ).length

  const activeOrdersCount =
    currentOrders.filter(
      (order) =>
        [
          'confirmed',
          'preparing',
          'ready',
        ].includes(order.status)
    ).length

  function renderOrderCard(
  order,
  showDoneButton = true,
  showHideButton = false
) {
  const orderNumber =
    orders.length -
    orders.indexOf(order)

  const hasLocation =
    typeof order.latitude === 'number' &&
    Number.isFinite(order.latitude) &&
    typeof order.longitude === 'number' &&
    Number.isFinite(order.longitude)

  const latitude = Number(order.latitude)
  const longitude = Number(order.longitude)

  const mapUrl = hasLocation
    ? `https://www.google.com/maps?q=${latitude},${longitude}`
    : ''

  return (
    <article
      className="admin-order-card"
      key={order.id}
    >
      <div className="admin-order-header">
        <div>
          <span className="admin-order-number">
            طلب #{orderNumber}
          </span>

          <h3>
            {order.customer_name}
          </h3>

          <small>
            {formatOrderDate(
              order.created_at
            )}
          </small>
        </div>

        <div className="admin-order-status-wrapper">
          <span
            className={
              getOrderStatusClass(
                order.status
              )
            }
          >
            {statusLabels[
              order.status
            ] || order.status}
          </span>

          {showDoneButton && (
            <>
              <select
                value={
                  order.status || 'new'
                }
                onChange={(event) =>
                  updateOrderStatus(
                    order.id,
                    event.target.value
                  )
                }
                disabled={
                  updatingOrderId ===
                  order.id
                }
              >
                {orderStatuses.map(
                  (status) => (
                    <option
                      key={
                        status.value
                      }
                      value={
                        status.value
                      }
                    >
                      {status.label}
                    </option>
                  )
                )}
              </select>

              <button
                type="button"
                className="admin-order-done-button"
                onClick={() =>
                  updateOrderStatus(
                    order.id,
                    'completed'
                  )
                }
                disabled={
                  updatingOrderId ===
                  order.id
                }
              >
                {updatingOrderId ===
                order.id
                  ? 'جاري...'
                  : 'تم'}
              </button>
            </>
          )}

          {showHideButton && (
            <button
              type="button"
              className="admin-order-hide-button"
              onClick={() =>
                hideCompletedOrder(
                  order.id
                )
              }
            >
              إخفاء
            </button>
          )}
        </div>
      </div>

      <div className="admin-order-details">

        <div className="admin-order-customer">

          <div>
            <span>
              الهاتف
            </span>

            <strong>
              {order.customer_phone ||
                '—'}
            </strong>
          </div>

          <div>
            <span>
              العنوان
            </span>

            <strong>
              {order.location_address ||
                order.customer_address ||
                '—'}
            </strong>
          </div>

          <div>
            <span>
              الدفع
            </span>

            <strong>
              {paymentLabels[
                order.payment_method
              ] ||
                order.payment_method ||
                '—'}
            </strong>
          </div>

        </div>


        {/* =========================================
            CUSTOMER LOCATION
        ========================================= */}

        <div
          style={{
            marginTop: '18px',
            padding: '16px',
            borderRadius: '14px',
            border:
              '1px solid var(--border)',
            background:
              'var(--surface)',
          }}
        >

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: hasLocation
                ? '12px'
                : '0',
            }}
          >

            <div>
              <span
                style={{
                  display: 'block',
                  fontSize: '12px',
                  opacity: 0.65,
                  marginBottom: '4px',
                }}
              >
                موقع العميل
              </span>

              <strong>
                {hasLocation
                  ? 'تم تحديد الموقع ✓'
                  : 'لم يتم تحديد موقع GPS'}
              </strong>
            </div>

            {hasLocation && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent:
                    'center',
                  gap: '7px',
                  padding:
                    '9px 14px',
                  borderRadius: '10px',
                  background:
                    'var(--gold)',
                  color:
                    'var(--background, #17110d)',
                  textDecoration: 'none',
                  fontWeight: '700',
                  fontSize: '13px',
                }}
              >
                📍 فتح الموقع على الخريطة
              </a>
            )}

          </div>


          {hasLocation && (
            <div
              style={{
                fontSize: '12px',
                opacity: 0.65,
                direction: 'ltr',
                textAlign: 'left',
              }}
            >
              {latitude.toFixed(6)},
              {' '}
              {longitude.toFixed(6)}
            </div>
          )}

          {!hasLocation && (
            <p
              style={{
                margin: '8px 0 0',
                fontSize: '13px',
                opacity: 0.65,
              }}
            >
              يعتمد الطلب على العنوان الذي كتبه العميل
            </p>
          )}

        </div>


        <div className="admin-order-items">

          <h4>
            المنتجات
          </h4>

          {order.items.length === 0 ? (
            <p>
              لا توجد تفاصيل للمنتجات
            </p>
          ) : (
            order.items.map(
              (item) => (
                <div
                  className="admin-order-item"
                  key={item.id}
                >
                  <div>
                    <strong>
                      {item.product_name}
                    </strong>

                    <span>
                      {item.quantity} ×{' '}
                      {Number(
                        item.price
                      ).toFixed(0)}{' '}
                      ₪
                    </span>
                  </div>

                  <strong>
                    {Number(
                      item.subtotal
                    ).toFixed(0)}{' '}
                    ₪
                  </strong>
                </div>
              )
            )
          )}

        </div>

      </div>


      {order.notes && (
        <div className="admin-order-notes">

          <span>
            ملاحظات العميل
          </span>

          <p>
            {order.notes}
          </p>

        </div>
      )}


      <div className="admin-order-total">

        <span>
          إجمالي الطلب
        </span>

        <strong>
          {Number(
            order.total
          ).toFixed(0)}{' '}
          ₪
        </strong>

      </div>

    </article>
  )
}

  return (
    <main className="admin-page">
      <div className="admin-container">
        <header className="admin-header">
          <div>
            <span className="admin-kicker">
              MOKA ADMIN
            </span>

            <h1>
              لوحة التحكم
            </h1>

            <p>
              إدارة المنتجات والطلبات من مكان واحد
            </p>
          </div>
        </header>

        {message && (
          <div className="admin-message success">
            {message}
          </div>
        )}

        {error && (
          <div className="admin-message error">
            {error}
          </div>
        )}

        {/* ================================
            ORDER SUMMARY
        ================================= */}

        <section className="admin-order-summary">
          <div className="admin-order-stat">
            <span>
              كل الطلبات
            </span>

            <strong>
              {orders.length}
            </strong>
          </div>

          <div className="admin-order-stat">
            <span>
              طلبات جديدة
            </span>

            <strong>
              {newOrdersCount}
            </strong>
          </div>

          <div className="admin-order-stat">
            <span>
              قيد التنفيذ
            </span>

            <strong>
              {activeOrdersCount}
            </strong>
          </div>

          <div className="admin-order-stat">
            <span>
              تمت
            </span>

            <strong>
              {completedOrdersCount}
            </strong>
          </div>
        </section>

        {/* ================================
            CURRENT ORDERS
        ================================= */}

        <section className="admin-orders-section">
          <div className="admin-section-title">
            <div>
              <span>
                ORDERS
              </span>

              <h2>
                الطلبات الحالية
              </h2>
            </div>

            <button
              type="button"
              className="admin-secondary-button"
              onClick={loadOrders}
              disabled={ordersLoading}
            >
              {ordersLoading
                ? 'جاري التحديث...'
                : 'تحديث الطلبات'}
            </button>
          </div>

          {ordersLoading ? (
            <div className="admin-empty">
              جاري تحميل الطلبات...
            </div>
          ) : currentOrders.length === 0 ? (
            <div className="admin-empty">
              لا توجد طلبات حالية
            </div>
          ) : (
            <div className="admin-orders-list">
              {currentOrders.map(
                (order) =>
                  renderOrderCard(
                    order,
                    true,
                    false
                  )
              )}
            </div>
          )}
        </section>

        {/* ================================
            COMPLETED ORDERS
        ================================= */}

        <section className="admin-orders-section admin-completed-orders-section">
          <div className="admin-section-title">
            <div>
              <span>
                COMPLETED
              </span>

              <h2>
                الطلبات التي تمت
              </h2>
            </div>

            <strong>
              {completedOrders.length} طلب
            </strong>
          </div>

          {ordersLoading ? (
            <div className="admin-empty">
              جاري تحميل الطلبات...
            </div>
          ) : completedOrders.length === 0 ? (
            <div className="admin-empty">
              لا توجد طلبات مكتملة حاليًا
            </div>
          ) : (
            <div className="admin-orders-list">
              {completedOrders.map(
                (order) =>
                  renderOrderCard(
                    order,
                    false,
                    true
                  )
              )}
            </div>
          )}
        </section>

        {/* ================================
            PRODUCT FORM
        ================================= */}

        <section className="admin-form-card">
          <div className="admin-section-title">
            <div>
              <span>
                {editingId
                  ? 'تعديل المنتج'
                  : 'منتج جديد'}
              </span>

              <h2>
                {editingId
                  ? 'تعديل بيانات المنتج'
                  : 'إضافة منتج جديد'}
              </h2>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>
                  اسم المنتج
                </span>

                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="مثال: كابتشينو"
                  disabled={saving}
                  required
                />
              </label>

              <label className="admin-field">
                <span>
                  السعر ₪
                </span>

                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  min="0"
                  step="0.5"
                  placeholder="14"
                  disabled={saving}
                  required
                />
              </label>

              <label className="admin-field">
                <span>
                  التصنيف
                </span>

                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  disabled={saving}
                >
                  {categories.map(
                    (category) => (
                      <option
                        key={
                          category.value
                        }
                        value={
                          category.value
                        }
                      >
                        {category.label}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="admin-field admin-field-full">
                <span>
                  الوصف
                </span>

                <textarea
                  name="description"
                  value={
                    form.description
                  }
                  onChange={handleChange}
                  rows="4"
                  placeholder="وصف قصير للمنتج"
                  disabled={saving}
                />
              </label>

              <div className="admin-field admin-field-full">
                <span>
                  صورة المنتج
                </span>

                <div className="image-upload">
                  <div className="image-upload-buttons">
                    <label
                      htmlFor="product-image-input"
                      className="image-upload-button"
                    >
                      📷 اختيار صورة
                    </label>

                    <input
                      id="product-image-input"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={
                        handleImageChange
                      }
                      disabled={saving}
                      className="image-file-input"
                    />

                    <label
                      htmlFor="product-camera-input"
                      className="image-upload-button image-camera-button"
                    >
                      📸 التقاط صورة
                    </label>

                    <input
                      id="product-camera-input"
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={
                        handleImageChange
                      }
                      disabled={saving}
                      className="image-file-input"
                    />
                  </div>

                  {imagePreview && (
                    <div className="image-preview">
                      <img
                        src={imagePreview}
                        alt="معاينة المنتج"
                        onError={(
                          event
                        ) => {
                          event.currentTarget.style.display =
                            'none'
                        }}
                      />
                    </div>
                  )}
                </div>

                <small>
                  JPG أو PNG أو WEBP — الحد الأقصى 5MB
                </small>
              </div>

              <label className="admin-active">
                <input
                  type="checkbox"
                  name="active"
                  checked={form.active}
                  onChange={handleChange}
                  disabled={saving}
                />

                <span>
                  المنتج متاح للزبائن
                </span>
              </label>
            </div>

            <div className="admin-form-actions">
              <button
                type="submit"
                className="admin-primary-button"
                disabled={saving}
              >
                {saving
                  ? 'جاري الحفظ...'
                  : editingId
                    ? 'حفظ التعديلات'
                    : 'إضافة المنتج'}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={resetForm}
                  disabled={saving}
                >
                  إلغاء التعديل
                </button>
              )}
            </div>
          </form>
        </section>

        {/* ================================
            PRODUCTS
        ================================= */}

        <section className="admin-products-section">
          <div className="admin-section-title">
            <div>
              <span>
                PRODUCTS
              </span>

              <h2>
                المنتجات الحالية
              </h2>
            </div>

            <strong>
              {products.length} منتج
            </strong>
          </div>

          {loading ? (
            <div className="admin-empty">
              جاري تحميل المنتجات...
            </div>
          ) : products.length === 0 ? (
            <div className="admin-empty">
              لا توجد منتجات حاليًا
            </div>
          ) : (
            <div className="admin-products-grid">
              {products.map(
                (product) => (
                  <article
                    className="admin-product-card"
                    key={product.id}
                  >
                    <div className="admin-product-image">
                      {product.image_url ? (
                        <img
                          src={
                            product.image_url
                          }
                          alt={product.name}
                          loading="lazy"
                          onError={(
                            event
                          ) => {
                            console.error(
                              'PRODUCT IMAGE LOAD ERROR:',
                              product.image_url
                            )

                            event.currentTarget.style.display =
                              'none'
                          }}
                        />
                      ) : (
                        <span>
                          ☕
                        </span>
                      )}

                      <span
                        className={
                          product.active
                            ? 'status active'
                            : 'status inactive'
                        }
                      >
                        {product.active
                          ? 'متاح'
                          : 'مخفي'}
                      </span>
                    </div>

                    <div className="admin-product-content">
                      <div className="admin-product-top">
                        <h3>
                          {product.name}
                        </h3>

                        <strong>
                          {Number(
                            product.price
                          ).toFixed(0)}{' '}
                          ₪
                        </strong>
                      </div>

                      <p>
                        {product.description ||
                          'بدون وصف'}
                      </p>

                      <div className="admin-product-actions">
                        <button
                          type="button"
                          onClick={() =>
                            startEdit(
                              product
                            )
                          }
                          disabled={
                            deletingId ===
                              product.id ||
                            togglingId ===
                              product.id
                          }
                        >
                          تعديل
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleActive(
                              product
                            )
                          }
                          disabled={
                            togglingId ===
                            product.id
                          }
                        >
                          {togglingId ===
                          product.id
                            ? 'جاري...'
                            : product.active
                              ? 'إخفاء'
                              : 'إظهار'}
                        </button>

                        <button
                          type="button"
                          className="danger"
                          onClick={() =>
                            deleteProduct(
                              product
                            )
                          }
                          disabled={
                            deletingId ===
                            product.id
                          }
                        >
                          {deletingId ===
                          product.id
                            ? 'جاري الحذف...'
                            : 'حذف'}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}