import { MessageList } from '../MessageList/MessageList';
import { ChatInput } from '../ChatInput/ChatInput';
import { OffersPopup } from '../../OffersPopup/OffersPopup';
import { DEFAULT_QUICK_REPLIES } from '../../../constants/default_quick_replies';
import { Cart } from '../../Cart-UI/Cart/Cart';
import type { ChatBodyProps, ProductType, StyleWithCustomProps } from '../../../types';
import { syncCartWithShopify } from '../../../services/shopify';
import { trackEvent } from '../../../services/chat';
import { useCart } from '../../../hooks/useCart';

const ChatBody = ({
    messages,
    isTyping,
    config,
    handleSendMessage,
    isOffersPopupOpen,
    offerTagsList,
    handleCloseOffers,
    handleOfferClick,
    jwtToken,
    isEmailGateVisible = false,
    handleError
}: ChatBodyProps) => {
    const { cartItems, isCartOpen, updateQuantity, toggleCart, addToCart} = useCart();

    const chatbotContainerStyles: StyleWithCustomProps = {
        '--theme-primary-color': config.primaryColor,
    };

    const handleProductAddToCart = async (product: ProductType) => {
        try {
            await addToCart(product);
            trackEvent('product_added_to_cart_via_slider', { productId: product.id, productName: product.name });
        } catch (err) {
            console.error("Error adding product to cart from Chatbot component:", err);
            handleError('Failed to add product to cart. Please try again.');
        }
    };
    
    const handleCheckout = async () => {
        try {
            const success = await syncCartWithShopify(cartItems);
            if (success) {
            window.location.href = '/cart';
            } else {
            throw new Error('Failed to sync cart');
            }
        } catch (err) {
            handleError('An error occurred during checkout. Please try again.');
        }
    };
    
    return (
        <>
            <MessageList
                messages={messages}
                isTyping={isTyping}
                primaryColor={config.primaryColor}
                onProductAddToCart={handleProductAddToCart}
            />
            <div className="chatbot-quick-replies" style={chatbotContainerStyles}>
                {DEFAULT_QUICK_REPLIES.map((reply) => (
                    <button
                        key={reply}
                        className="chatbot-quick-reply-button"
                        onClick={() => handleSendMessage(reply)}
                    >
                        {reply}
                    </button>
                ))}
            </div>
            <ChatInput
                onSendMessage={handleSendMessage}
                disabled={isTyping || (!jwtToken && !config.allowGuestMode && !config.showEmailGate) || (isEmailGateVisible && config.showEmailGate)}
                primaryColor={config.primaryColor}
            />
            <Cart
                isOpen={isCartOpen}
                items={cartItems}
                onClose={toggleCart}
                onUpdateQuantity={updateQuantity}
                onCheckout={handleCheckout}
                primaryColor={config.primaryColor}
            />
            <OffersPopup
                isOpen={isOffersPopupOpen}
                onClose={handleCloseOffers}
                offerTags={offerTagsList}
                primaryColor={config.primaryColor}
                onOfferClick={handleOfferClick}
                shopDomain={config.shopId}
            />
        </>
    );
};

export default ChatBody;