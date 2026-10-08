import React, { useState, useMemo } from 'react'
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  MapPin,
  Coffee,
  CheckCircle2,
  Sparkles
} from 'lucide-react'
import { useExpense } from '../context/ExpenseContext'
import type { Shop, MenuItem } from '../types'

interface ShopItemsPageProps {
  shop: Shop
  onBack: () => void
  onStartBreak?: (shop: Shop) => void
}

export const ShopItemsPage: React.FC<ShopItemsPageProps> = ({
  shop,
  onBack,
  onStartBreak
}) => {
  const {
    menuItems,
    getMenuItemsForShop,
    updateMenuItemPrice,
    deleteMenuItem,
    addCustomMenuItem
  } = useExpense()

  // Shop-specific menu items
  const shopMenuItems = useMemo(() => {
    return getMenuItemsForShop(shop.id)
  }, [getMenuItemsForShop, shop.id, menuItems])

  // State
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editPriceValue, setEditPriceValue] = useState<string>('')
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('20')
  const [newItemCategory, setNewItemCategory] = useState<MenuItem['category']>('snacks')
  const [newItemEmoji, setNewItemEmoji] = useState('☕')
  const [toastNotice, setToastNotice] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastNotice(msg)
    setTimeout(() => setToastNotice(null), 3000)
  }

  // Handle edit price
  const handleSavePrice = (item: MenuItem) => {
    const parsed = parseFloat(editPriceValue)
    if (!isNaN(parsed) && parsed >= 0) {
      const finalPrice = Math.round(parsed)
      updateMenuItemPrice(item.id, finalPrice)
      showToast(`Updated ${item.name} price to ₹${finalPrice}!`)
    }
    setEditingItemId(null)
  }

  // Handle delete item
  const handleDeleteItem = (item: MenuItem) => {
    deleteMenuItem(item.id)
    showToast(`Removed "${item.name}" from ${shop.name} menu.`)
  }

  // Handle add item
  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return
    const priceNum = Math.max(0, Math.round(parseFloat(newItemPrice) || 15))
    addCustomMenuItem(newItemName.trim(), priceNum, newItemEmoji, newItemCategory, shop.id)
    setShowAddItemModal(false)
    showToast(`Added "${newItemName.trim()}" (₹${priceNum}) to ${shop.name}!`)
    setNewItemName('')
    setNewItemPrice('20')
  }


  return (
    <div className="space-y-4 animate-in fade-in pb-4">
      {/* Toast Notification */}
      {toastNotice && (
        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{toastNotice}</span>
          </div>
          <button onClick={() => setToastNotice(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Navigation Bar with Back Button */}
      <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          id="back-to-shops-btn"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-stone-700 dark:text-stone-300 hover:text-amber-800 dark:hover:text-amber-200 text-xs font-bold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Shops</span>
        </button>

        <div className="text-center truncate">
          <h2 className="font-heading font-extrabold text-sm text-stone-900 dark:text-stone-100 truncate">
            {shop.name} Menu
          </h2>
          <span className="text-[10px] text-stone-400 font-medium">
            {shopMenuItems.length} Items Available
          </span>
        </div>

        <button
          onClick={() => setShowAddItemModal(true)}
          id="add-item-top-btn"
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs cursor-pointer active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Shop Info Hero Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 text-white shadow-md space-y-3 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="text-3xl p-2.5 rounded-2xl bg-white/20 backdrop-blur-md shadow-xs">
              {shop.emoji}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-lg tracking-tight">
                  {shop.name}
                </h3>
              </div>
              <div className="flex items-center gap-1 text-xs text-amber-100 mt-0.5">
                <MapPin className="w-3 h-3 text-amber-200 shrink-0" />
                <span>{shop.location}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs">
          <span className="text-[11px] text-amber-100 truncate max-w-[210px]">
            Specialty: <strong className="text-white">{shop.specialty}</strong>
          </span>

          {onStartBreak && (
            <button
              onClick={() => onStartBreak(shop)}
              id="start-break-hero-btn"
              className="px-3 py-1.5 rounded-xl bg-white text-stone-900 hover:bg-amber-50 active:scale-95 text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Coffee className="w-3.5 h-3.5 text-amber-700" />
              <span>Start Break ☕</span>
            </button>
          )}
        </div>
      </div>

      {/* Items Section Header */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Menu Items ({shopMenuItems.length})</span>
        </span>
        <span className="text-[10px] text-stone-400 font-medium">
          Edit price or delete any item
        </span>
      </div>

      {/* Items List */}
      {shopMenuItems.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 text-stone-400 text-xs space-y-2">
          <p>No items in {shop.name} menu yet.</p>
          <button
            onClick={() => setShowAddItemModal(true)}
            className="text-amber-600 hover:underline font-bold text-xs"
          >
            + Add a new item now
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {shopMenuItems.map(item => {
            const isEditing = editingItemId === item.id

            return (
              <div
                key={item.id}
                id={`item-card-${item.id}`}
                className="p-3 rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xs flex items-center justify-between gap-2.5 transition-all hover:border-amber-200 dark:hover:border-stone-700"
              >
                {/* Left: Emoji + Item Name + Category */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="text-xl p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/30 shrink-0">
                    {item.emoji}
                  </span>
                  <div className="truncate flex-1">
                    <div className="font-heading font-bold text-xs text-stone-900 dark:text-stone-100 truncate">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-stone-400 flex items-center gap-1.5 mt-0.5">
                      <span className="px-1.5 py-0.2 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-semibold capitalize text-[9px]">
                        {item.category}
                      </span>
                      {item.description && (
                        <span className="truncate max-w-[140px] text-stone-400">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Price + Edit Price + Delete Item */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isEditing ? (
                    /* Inline Price Editor */
                    <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/70 p-1 rounded-xl border border-amber-400 dark:border-amber-700 animate-in fade-in">
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300 pl-1">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={editPriceValue}
                        onChange={e => setEditPriceValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSavePrice(item)
                          if (e.key === 'Escape') setEditingItemId(null)
                        }}
                        autoFocus
                        className="w-14 py-0.5 px-1 text-xs font-bold rounded-lg bg-white dark:bg-stone-900 border border-amber-400 text-stone-900 dark:text-stone-100 text-center focus:outline-none"
                      />
                      <button
                        onClick={() => handleSavePrice(item)}
                        title="Save price"
                        className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingItemId(null)}
                        title="Cancel"
                        className="p-1 rounded-lg bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 text-stone-700 dark:text-stone-300 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* Normal Display Mode */
                    <>
                      {/* Price Badge */}
                      <span className="font-heading font-extrabold text-amber-800 dark:text-amber-300 text-xs px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-900/40">
                        ₹{item.price}
                      </span>

                      {/* Edit Price Button */}
                      <button
                        onClick={() => {
                          setEditingItemId(item.id)
                          setEditPriceValue(item.price.toString())
                        }}
                        id={`edit-price-${item.id}`}
                        title={`Edit price of ${item.name}`}
                        className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-stone-600 dark:text-stone-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                      >
                        <Edit2 className="w-3 h-3 text-stone-500 hover:text-amber-700" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>

                      {/* Delete Item Button */}
                      <button
                        onClick={() => handleDeleteItem(item)}
                        id={`delete-item-${item.id}`}
                        title={`Delete ${item.name}`}
                        className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add New Item Button at Bottom */}
      <button
        onClick={() => setShowAddItemModal(true)}
        id="add-item-bottom-card-btn"
        className="w-full py-3 border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-500 dark:hover:border-amber-500 rounded-2xl text-stone-600 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer bg-white/60 dark:bg-stone-900/60 shadow-2xs hover:bg-amber-50/40"
      >
        <Plus className="w-4 h-4" />
        <span>Add New Item to {shop.name} Menu</span>
      </button>

      {/* Modal: Add Item */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-100">
                  Add Item to Menu ☕
                </h3>
                <p className="text-[11px] text-stone-400">
                  Add a new tea, snack or drink to {shop.name}
                </p>
              </div>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-3 text-left">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Parippu Vada, Bun Maska, Pazham Pori"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="20"
                    value={newItemPrice}
                    onChange={e => setNewItemPrice(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Category
                  </label>
                  <select
                    value={newItemCategory}
                    onChange={e => setNewItemCategory(e.target.value as MenuItem['category'])}
                    className="w-full py-2 px-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs focus:outline-none"
                  >
                    <option value="tea">Tea</option>
                    <option value="coffee">Coffee</option>
                    <option value="snacks">Snacks</option>
                    <option value="quick-bites">Quick Bites</option>
                    <option value="drinks">Drinks</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Select Emoji
                </label>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['☕', '🍵', '🥟', '🍞', '🥪', '🍪', '🧆', '🥤', '🫓', '🍛'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewItemEmoji(emoji)}
                      className={`w-8 h-8 rounded-xl text-sm flex items-center justify-center cursor-pointer transition-all ${
                        newItemEmoji === emoji
                          ? 'bg-amber-600 text-white scale-110 shadow-xs ring-2 ring-amber-400'
                          : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="save-new-item-submit-btn"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Item</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
