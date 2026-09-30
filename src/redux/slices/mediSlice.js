import { createSlice } from "@reduxjs/toolkit";

const savedMedicines = JSON.parse(
  localStorage.getItem("medicines")
);

const defaultMedicines = [
  {
    id: 1,
    name: "Paracetamol",
    price: 50,
    stock: 100,
    category: "Tablet",
    expiry: "2026-07-01",
  },
  {
    id: 2,
    name: "Ibuprofen",
    price: 60,
    stock: 0,
    category: "Tablet",
    expiry: "2026-09-01",
  },
  {
    id: 3,
    name: "Combiflam",
    price: 80,
    stock: 10,
    category: "Tablet",
    expiry: "2027-05-01",
  },
  {
    id: 4,
    name: "Crocin",
    price: 70,
    stock: 90,
    category: "Syrup",
    expiry: "2027-04-01",
  },
  {
    id: 5,
    name: "Benadryl",
    price: 80,
    stock: 6,
    category: "Syrup",
    expiry: "2027-05-01",
  },
  {
    id: 6,
    name: "Tetanus",
    price: 90,
    stock: 0,
    category: "Injection",
    expiry: "2027-06-01",
  },
];

const initialState = {
  medicines:
    savedMedicines && savedMedicines.length > 0
      ? savedMedicines
      : defaultMedicines,
};

const mediSlice = createSlice({
  name: "medicines",

  initialState,

  reducers: {
    AddMedicine: (state, action) => {
      state.medicines.push(action.payload);
    },

    DelMedicine: (state, action) => {
      state.medicines = state.medicines.filter(
        (medicine) => medicine.id !== action.payload
      );
    },

    EditMedicine: (state, action) => {
      const {
        id,
        name,
        price,
        stock,
        category,
        expiry,
      } = action.payload;

      const existingMedicine = state.medicines.find(
        (medicine) => medicine.id === id
      );

      if (existingMedicine) {
        existingMedicine.name = name;
        existingMedicine.price = price;
        existingMedicine.stock = stock;
        existingMedicine.category = category;
        existingMedicine.expiry = expiry;
      }
    },

    UpdateMedicine: (state, action) => {
      const existingMedicine = state.medicines.find(
        (medicine) => medicine.id === action.payload.id
      );

      if (existingMedicine) {
        existingMedicine.stock = action.payload.stock;
      }
    },
  },
});

export const {
  AddMedicine,
  DelMedicine,
  EditMedicine,
  UpdateMedicine,
} = mediSlice.actions;

export default mediSlice.reducer;