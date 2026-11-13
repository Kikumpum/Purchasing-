# ERD logis

Diagram dibagi menurut domain. Entitas yang muncul pada dua diagram merujuk ke tabel yang sama. Lihat [rancangan skema](schema.md) untuk kunci unik, relasi histori, dan kontrol konkurensi.

## Organisasi hingga PO

```mermaid
erDiagram
  DEPARTMENTS ||--o{ PROFILES : has
  PROFILES ||--o{ MANAGER_DEPARTMENT_ACCESS : assigned
  DEPARTMENTS ||--o{ MANAGER_DEPARTMENT_ACCESS : scoped
  PROFILES ||--o{ USER_WAREHOUSE_ACCESS : assigned
  WAREHOUSES ||--o{ USER_WAREHOUSE_ACCESS : scoped
  PRODUCT_CATEGORIES ||--o{ PRODUCTS : categorizes
  UNITS_OF_MEASURE ||--o{ PRODUCTS : measures
  PROFILES ||--o{ PURCHASE_REQUESTS : requests
  DEPARTMENTS ||--o{ PURCHASE_REQUESTS : snapshots
  PURCHASE_REQUESTS ||--o{ PURCHASE_REQUEST_ITEMS : contains
  PURCHASE_REQUESTS ||--o{ PURCHASE_REQUEST_APPROVALS : records
  PURCHASE_REQUESTS ||--o{ PURCHASE_REQUEST_STATUS_HISTORY : records
  PROFILES ||--o{ PURCHASE_REQUEST_APPROVALS : decides
  PRODUCTS ||--o{ PURCHASE_REQUEST_ITEMS : requested
  PURCHASE_REQUEST_ITEMS ||--o{ FULFILLMENT_ALLOCATIONS : allocated
  WAREHOUSES ||--o{ FULFILLMENT_ALLOCATIONS : scoped
  PURCHASE_REQUESTS ||--o{ QUOTATIONS : solicits
  VENDORS ||--o{ QUOTATIONS : quotes
  QUOTATIONS ||--o{ QUOTATION_ITEMS : contains
  PURCHASE_REQUEST_ITEMS ||--o{ QUOTATION_ITEMS : prices
  PURCHASE_REQUESTS ||--o{ PURCHASE_ORDERS : orders
  VENDORS ||--o{ PURCHASE_ORDERS : supplies
  WAREHOUSES ||--o{ PURCHASE_ORDERS : destination
  PURCHASE_ORDERS ||--o{ PURCHASE_ORDER_ITEMS : contains
  PURCHASE_ORDERS ||--o{ PURCHASE_ORDER_STATUS_HISTORY : records
  FULFILLMENT_ALLOCATIONS ||--o| PURCHASE_ORDER_ITEMS : authorizes
  QUOTATION_ITEMS ||--o{ PURCHASE_ORDER_ITEMS : selected_from
```

## Persediaan dan jejak transaksi

```mermaid
erDiagram
  PRODUCTS ||--o{ INVENTORY_BALANCES : balances
  WAREHOUSES ||--o{ INVENTORY_BALANCES : holds
  FULFILLMENT_ALLOCATIONS ||--o| INVENTORY_RESERVATIONS : reserves
  INVENTORY_BALANCES ||--o{ INVENTORY_RESERVATIONS : backs
  PURCHASE_ORDERS ||--o{ GOODS_RECEIPTS : received
  GOODS_RECEIPTS ||--o{ GOODS_RECEIPT_ITEMS : contains
  PURCHASE_ORDER_ITEMS ||--o{ GOODS_RECEIPT_ITEMS : fulfills
  PURCHASE_REQUESTS ||--o{ INVENTORY_ISSUES : issued
  WAREHOUSES ||--o{ INVENTORY_ISSUES : source
  INVENTORY_ISSUES ||--o{ INVENTORY_ISSUE_ITEMS : contains
  INVENTORY_RESERVATIONS ||--o{ INVENTORY_ISSUE_ITEMS : consumes
  WAREHOUSES ||--o{ STOCK_TRANSFERS : source
  WAREHOUSES ||--o{ STOCK_TRANSFERS : destination
  STOCK_TRANSFERS ||--o{ STOCK_TRANSFER_ITEMS : contains
  STOCK_TRANSFERS ||--o{ TRANSFER_RECEIPTS : received
  TRANSFER_RECEIPTS ||--o{ TRANSFER_RECEIPT_ITEMS : contains
  STOCK_TRANSFER_ITEMS ||--o{ TRANSFER_RECEIPT_ITEMS : reconciles
  WAREHOUSES ||--o{ STOCK_OPNAMES : counts
  STOCK_OPNAMES ||--o{ STOCK_OPNAME_ITEMS : contains
  STOCK_OPNAME_ITEMS ||--o{ STOCK_ADJUSTMENTS : proposes_by_count_version
  INVENTORY_TRANSACTIONS ||--|{ STOCK_MOVEMENTS : posts
  PRODUCTS ||--o{ STOCK_MOVEMENTS : moved
  WAREHOUSES |o--o{ STOCK_MOVEMENTS : physical_location
  STOCK_TRANSFERS |o--o{ STOCK_MOVEMENTS : transit_location
  PROFILES ||--o{ NOTIFICATIONS : receives
  PROFILES |o--o{ AUDIT_LOGS : performs
```

Profil berelasi 1:1 ke Supabase Auth. Baris ledger memakai lokasi fisik atau akun transit per baris transfer. FK sumber transaksi dijelaskan di rancangan skema. Notifikasi dan audit menyimpan referensi entitas serta metadata event. Akses ke dokumen tujuan diperiksa saat dibuka.
