"""
AI Shadow Generation Service
Creates realistic contact/ground shadows for isolated product cutouts.
"""
import io
import base64
import numpy as np
from PIL import Image, ImageFilter

class ShadowService:
    @staticmethod
    def generate_ground_shadow(image_input, blur_radius=20, opacity=0.35, offset_y=15):
        """
        Generates a realistic soft ground/contact shadow from RGBA product image.
        """
        if isinstance(image_input, str):
            if "," in image_input:
                image_input = image_input.split(",")[1]
            image_data = base64.b64decode(image_input)
            img = Image.open(io.BytesIO(image_data)).convert("RGBA")
        elif isinstance(image_input, Image.Image):
            img = image_input.convert("RGBA")
        else:
            raise ValueError("Unsupported image input format")

        # Extract alpha channel
        alpha = img.split()[-1]

        # Create shadow mask
        shadow_mask = alpha.filter(ImageFilter.GaussianBlur(blur_radius))
        shadow_img = Image.new("RGBA", img.size, (0, 0, 0, int(255 * opacity)))
        shadow_img.putalpha(shadow_mask)

        # Offset shadow downward slightly
        canvas = Image.new("RGBA", img.size, (0, 0, 0, 0))
        canvas.paste(shadow_img, (0, offset_y), shadow_img)

        # Composite under product
        result = Image.alpha_composite(canvas, img)

        output_buffer = io.BytesIO()
        result.save(output_buffer, format="PNG")
        return base64.b64encode(output_buffer.getvalue()).decode("utf-8")
