-- CreateTable
CREATE TABLE "evidence_packets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT,
    "title" TEXT NOT NULL,
    "purpose_note" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_packets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_packet_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "packet_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "evidence_packet_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evidence_packets_organization_id_idx" ON "evidence_packets"("organization_id");

-- CreateIndex
CREATE INDEX "evidence_packet_items_organization_id_idx" ON "evidence_packet_items"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_packet_items_packet_id_kind_record_id_key" ON "evidence_packet_items"("packet_id", "kind", "record_id");

-- AddForeignKey
ALTER TABLE "evidence_packets" ADD CONSTRAINT "evidence_packets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packets" ADD CONSTRAINT "evidence_packets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packet_items" ADD CONSTRAINT "evidence_packet_items_packet_id_fkey" FOREIGN KEY ("packet_id") REFERENCES "evidence_packets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
