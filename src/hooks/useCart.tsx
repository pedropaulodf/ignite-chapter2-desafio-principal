import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
  handleCheckout: () => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {

      // Faz a copia dos itens que já estão no carrinho ou não
      const actualCartItems = [...cart];

      // Verifica se o item existe no carrinho
      // [O ITEM RETORNADO ESTÁ LIGADO NA MEMÓRIA AO actualCartItems !!!]]
      const productExistsInCart = actualCartItems.find((product) => product.id === productId)
      
      // Busca o estoque do item
      const stockItem = await api.get<Stock>(`/stock/${productId}`).then(response => response.data);

      if(!productExistsInCart){
        const product = await api.get<Product>(`/products/${productId}`).then(response => response.data);
        actualCartItems.push({...product, amount: 1});
      } else {

        // Se a quantidade do produto for igual ou maior ao do estoque, acusa o erro
        if(productExistsInCart.amount >= stockItem.amount){
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
        
        // Seta mais um do produto
        productExistsInCart.amount += 1;
      }

      // Seta o novo array de items e salva no localStorage
      setCart(actualCartItems);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(actualCartItems));

    } catch(e) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      
      // Faz a copia dos itens que já estão no carrinho ou não
      const actualCartItems = [...cart];

      // Filtrar os items, menos o item a ser removido
      const productIndex = actualCartItems.findIndex((product) => product.id === productId);
      
      if(productIndex >= 0){
        actualCartItems.splice(productIndex, 1);
        setCart(actualCartItems);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(actualCartItems));
      } else {
        throw Error()
      }

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const handleCheckout = () => {
    toast.success('Show! Vamos para o próximo passo!');
  }

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      
      if(amount <= 0){
        return;
      }

      // Faz a copia dos itens que já estão no carrinho ou não
      const actualCartItems = [...cart];

      // Busca o item no carrinho
      const productToBeUpdated = actualCartItems.find((product) => product.id === productId);
      
      // Busca o estoque do item
      const stockItem = await api.get<Stock>(`/stock/${productId}`).then(response => response.data);


      if(productToBeUpdated){

        // Se a quantidade do produto for igual ou maior ao do estoque, acusa o erro
        if(amount > stockItem.amount){
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        productToBeUpdated.amount = amount;
      }

      // Salva e guarda no storage
      setCart(actualCartItems);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(actualCartItems));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount, handleCheckout }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
