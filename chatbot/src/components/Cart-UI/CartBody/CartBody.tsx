import type { CartBodyProps } from '../../../types';
import { MinusIcon, PlusIcon } from '../../../utils/icon';
import './CartBody.scss';

const CartBody = ({id, name, image_url, price, quantity, onUpdateQuantity, dynamicStyles}: CartBodyProps) => {

    const formatPrice = (price: number) => {
        if(price > 0) {
            return price.toFixed(2);
        }
        return '0.00';
    }
      
    return (
        <div className="cart-item-container" key={String(id)}>
        <img src={image_url} alt={name} className="cart-item-image" />
        <div className="cart-item-details">
          <h4 className="cart-item-name">{name}</h4>
          <p className="cart-item-price">
            ${formatPrice(price)}
          </p>
        </div>
        <div className="cart-quantity-controls">
            <MinusIcon dynamicStyles={dynamicStyles} onUpdateQuantity={onUpdateQuantity} id={id} quantity={quantity} />
            <span className="cart-quantity">{quantity}</span>
            <PlusIcon dynamicStyles={dynamicStyles} onUpdateQuantity={onUpdateQuantity} id={id} quantity={quantity} disabled={quantity >= 10} />
        </div>
      </div>
    )
}

export default CartBody;