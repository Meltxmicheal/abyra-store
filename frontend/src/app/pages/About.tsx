export const About = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <img 
            src="https://res.cloudinary.com/dze1d3uen/image/upload/q_auto/f_auto/v1778080269/sgtzcvsm6uvuc4oasne0.jpg" 
            alt="ABYRA STORE Official Logo" 
            loading="lazy"
            className="h-32 w-32 rounded-full object-cover mx-auto mb-6 shadow-xl shadow-purple-100"
          />
          <h1 className="text-4xl font-black text-gray-900 mb-4 uppercase tracking-tighter">About ABYRA</h1>
          <p className="text-xl text-gray-600 font-medium">Handcrafted with Love, Made to Last Forever</p>
        </div>

        <div className="prose prose-lg max-w-none">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Story</h2>
            <p className="text-gray-700 mb-4">
              ABYRA was born from a passion for preserving the art of crochet and bringing handmade beauty into modern homes. 
              Each piece in our collection is meticulously handcrafted by skilled artisans who pour their heart and soul into every stitch.
            </p>
            <p className="text-gray-700">
              Unlike traditional flowers that wilt and fade, our crochet creations last forever, making them perfect keepsakes 
              and gifts that carry memories for years to come.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-purple-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-2">🧶 100% Handmade</h3>
                <p className="text-gray-700 text-sm">
                  Every product is carefully crafted by hand using premium quality yarn and materials.
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-2">♻️ Sustainable</h3>
                <p className="text-gray-700 text-sm">
                  We believe in eco-friendly practices and creating products that are kind to our planet.
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-2">💜 Made with Love</h3>
                <p className="text-gray-700 text-sm">
                  Each piece carries the warmth and care of skilled artisans who love what they do.
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-2">⭐ Quality First</h3>
                <p className="text-gray-700 text-sm">
                  We never compromise on quality, ensuring each product meets our high standards.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Why Choose Us?</h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-purple-600 mr-2">✓</span>
                <span>Unique, one-of-a-kind handmade products</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-600 mr-2">✓</span>
                <span>Premium quality materials and craftsmanship</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-600 mr-2">✓</span>
                <span>Products that last forever - no wilting, no fading</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-600 mr-2">✓</span>
                <span>Custom orders available for personalized creations</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-600 mr-2">✓</span>
                <span>Supporting local artisans and traditional crafts</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Get in Touch</h2>
            <p className="text-gray-700 mb-6">
              Have questions or want to place a custom order? We'd love to hear from you!
            </p>
            <a
              href="mailto:abyra.com@gmail.com"
              className="inline-block bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
