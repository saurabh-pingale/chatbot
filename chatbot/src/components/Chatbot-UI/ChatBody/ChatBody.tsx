import { MessageList } from '../MessageList/MessageList';
import { ChatInput } from '../ChatInput/ChatInput';
import { Cart } from '../../Cart-UI/Cart/Cart';
import { useCart } from '../../../context/CartContext';
import type { ChatBodyProps, ProductType, StyleWithCustomProps } from '../../../types';

const ChatBody = ({
    messages,
    isTyping,
    config,
    handleSendMessage,
    jwtToken,
    isEmailGateVisible = false,
    handleError,
    isChatLimitReached,
    quickReplies,
    tags,
    categories
}: ChatBodyProps) => {
    const { cartItems, isCartOpen, updateQuantity, toggleCart, addToCart, checkout } = useCart();

    const chatbotContainerStyles: StyleWithCustomProps = {
        '--theme-primary-color': config.primaryColor,
    };

    const handleProductAddToCart = async (product: ProductType) => {
        try {
            await addToCart(product);
        } catch (err) {
            console.error("Error adding product to cart from Chatbot component:", err);
            handleError('Failed to add product to cart. Please try again.');
        }
    };
        
    return (
        <>
            <MessageList
                messages={messages}
                isTyping={isTyping}
                primaryColor={config.primaryColor}
                onProductAddToCart={handleProductAddToCart}
                tags={tags}
                handleSendMessage={handleSendMessage}
                categories={categories}
            />

            <div className="chatbot-quick-replies" style={chatbotContainerStyles}>
                {quickReplies.map((reply) => (
                    <button
                        key={reply}
                        className="chatbot-quick-reply-button"
                        onClick={() => handleSendMessage(reply)}
                        disabled={isTyping}
                    >
                        {reply}
                    </button>
                ))}
            </div>
            <ChatInput
                onSendMessage={handleSendMessage}
                disabled={isTyping || (config.showEmailGate && isEmailGateVisible && !jwtToken) || isChatLimitReached}
                primaryColor={config.primaryColor}
            />
            <Cart
                isOpen={isCartOpen}
                items={cartItems}
                onClose={toggleCart}
                onUpdateQuantity={updateQuantity}
                onCheckout={checkout}
                primaryColor={config.primaryColor}
            />
        </>
    );
};

export default ChatBody;