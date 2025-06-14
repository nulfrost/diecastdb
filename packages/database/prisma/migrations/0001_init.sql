-- CreateTable
CREATE TABLE "hotwheels" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "image_url" TEXT,
    "year" TEXT,
    "series" TEXT,
    "model_number" TEXT
);

-- CreateTable
CREATE TABLE "designers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "_HotwheelDesigners" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_HotwheelDesigners_A_fkey" FOREIGN KEY ("A") REFERENCES "designers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_HotwheelDesigners_B_fkey" FOREIGN KEY ("B") REFERENCES "hotwheels" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "designers_name_key" ON "designers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_HotwheelDesigners_AB_unique" ON "_HotwheelDesigners"("A", "B");

-- CreateIndex
CREATE INDEX "_HotwheelDesigners_B_index" ON "_HotwheelDesigners"("B");
