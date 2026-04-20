"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Category = {
  id: string;
  name: string;
  active: boolean | null;
};

type Product = {
  id: number;
  name: string;
  price: number;
  categories: Category[];
};

type ProductForm = {
  id: number | null;
  name: string;
  price: string;
  categoryIds: string[];
};

export default function Page() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productForm, setProductForm] = useState<ProductForm>({
    id: null,
    name: "",
    price: "",
    categoryIds: [],
  });

  useEffect(() => {
    refreshAll();
  }, []);

  const refreshAll = async () => {
    await loadCategories();
    await loadProducts();
  };

  const loadCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    setCategories(data || []);
  };

  // ✅ FINAL FIXED PRODUCT LOADER (JOIN BASED)
  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        product_categories (
          category_id,
          categories (
            id,
            name,
            active
          )
        )
      `)
      .order("name");

    if (error) {
      console.error(error);
      return;
    }

    const formatted = (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      categories: (p.product_categories || [])
        .map((pc: any) => pc.categories)
        .filter(Boolean),
    }));

    setProducts(formatted);
  };

  const saveProduct = async () => {
    if (!productForm.name || !productForm.price) return;

    let productId = productForm.id;

    if (!productId) {
      const { data } = await supabase
        .from("products")
        .insert({
          name: productForm.name,
          price: Number(productForm.price),
        })
        .select()
        .single();

      productId = data.id;
    } else {
      await supabase
        .from("products")
        .update({
          name: productForm.name,
          price: Number(productForm.price),
        })
        .eq("id", productId);
    }

    // 🔥 DELETE OLD LINKS
    await supabase
      .from("product_categories")
      .delete()
      .eq("product_id", productId);

    // 🔥 INSERT NEW LINKS
    if (productForm.categoryIds.length > 0) {
      const rows = productForm.categoryIds.map((catId) => ({
        product_id: productId,
        category_id: catId,
      }));

      const { error } = await supabase
        .from("product_categories")
        .insert(rows);

      if (error) {
        console.error(error);
      }
    }

    setProductForm({
      id: null,
      name: "",
      price: "",
      categoryIds: [],
    });

    await loadProducts();
  };

  const toggleCategory = (id: string) => {
    setProductForm((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id)
        ? prev.categoryIds.filter((c) => c !== id)
        : [...prev.categoryIds, id],
    }));
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Spill The Tea POS</h1>

      <h2>Product Setup</h2>

      <input
        placeholder="Product Name"
        value={productForm.name}
        onChange={(e) =>
          setProductForm({ ...productForm, name: e.target.value })
        }
      />

      <input
        placeholder="Price"
        value={productForm.price}
        onChange={(e) =>
          setProductForm({ ...productForm, price: e.target.value })
        }
      />

      <h3>Assign Categories</h3>
      {categories.map((c) => (
        <button
          key={c.id}
          onClick={() => toggleCategory(c.id)}
          style={{
            margin: 5,
            background: productForm.categoryIds.includes(c.id)
              ? "red"
              : "lightgray",
          }}
        >
          {c.name}
        </button>
      ))}

      <br />
      <button onClick={saveProduct}>Save Product</button>

      <h2>Existing Products</h2>

      {products.map((p) => (
        <div key={p.id} style={{ border: "1px solid #ccc", margin: 10 }}>
          <h3>{p.name}</h3>
          <p>Rs {p.price}</p>
          <p>
            Categories:{" "}
            {p.categories.length > 0
              ? p.categories.map((c) => c.name).join(", ")
              : "None"}
          </p>
        </div>
      ))}
    </div>
  );
}
