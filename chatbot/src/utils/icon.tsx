import { motion } from "framer-motion"
import { CloseIcon as CloseIconSVG } from "../assets/close_icon"
import type { MinusIconProps, PlusIconProps } from "../types"

export const CloseIcon = ({onClose}: {onClose: () => void}) => {
  return (
    <motion.button
      className="cart-close-button"
      onClick={onClose}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <CloseIconSVG />
    </motion.button>
  )
}

export const MinusIcon = ({dynamicStyles, onUpdateQuantity, id, quantity, disabled}: MinusIconProps) => {
  return (
    <motion.button
      className="cart-quantity-button"
      style={dynamicStyles} 
      disabled={disabled}
      onClick={() => onUpdateQuantity(String(id), quantity - 1)}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      -
    </motion.button>
  )
}

export const PlusIcon = ({dynamicStyles, onUpdateQuantity, id, quantity, availableQty, disabled }: PlusIconProps) => {
  return (
    <motion.button
      className="cart-quantity-button"
      style={dynamicStyles} 
      onClick={() => onUpdateQuantity(String(id), quantity + 1)}
      disabled={disabled || quantity >= (availableQty ?? 10)}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      +
    </motion.button>
  )
}