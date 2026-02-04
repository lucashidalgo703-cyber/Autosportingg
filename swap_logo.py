from PIL import Image

def process_user_logo(input_path, output_path):
    print(f"Processing User Logo {input_path}...")
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()
        
        # Check corners to detect background color
        w, h = img.size
        corners = [
            img.getpixel((0,0)),
            img.getpixel((w-1,0)),
            img.getpixel((0,h-1)),
            img.getpixel((w-1,h-1))
        ]
        
        # Check if corners are "White" (RGB > 240, Alpha > 200)
        is_white_bg = all(c[0] > 240 and c[1] > 240 and c[2] > 240 and c[3] > 200 for c in corners)
        print(f"Detected White Background: {is_white_bg}")

        new_data = []
        for item in datas:
            r, g, b, a = item
            
            if is_white_bg:
                # Remove White Background
                if r > 220 and g > 220 and b > 220:
                    new_data.append((255, 255, 255, 0)) # Transparent
                    continue
            else:
                # If already transparent background, respect alpha
                if a < 20:
                    new_data.append((255, 255, 255, 0))
                    continue

            # Preservation Logic for Content
            # 1. Red Swoosh -> Keep Red
            if r > 100 and r > g + 20 and r > b + 20:
                new_data.append((r, g, b, a))
            # 2. Other Content -> Ensure it's White (if it was blue/black)
            # If the user provided a white text logo, this keeps it white.
            # If they provided blue text, this forces it white (matching site theme).
            else:
                new_data.append((255, 255, 255, a))

        img.putdata(new_data)
        
        # Trim
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)
            print(f"Trimmed to {img.size}")
        
        img.save(output_path, "PNG")
        print(f"Saved to {output_path}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    input_file = "C:/Users/USER/.gemini/antigravity/brain/29f07675-4bd2-4fd5-b270-449975b7c398/uploaded_media_1770224286240.png"
    output_file = "c:/Users/USER/.gemini/antigravity/scratch/Autosportingg/public/logo-header-final-user.png"
    process_user_logo(input_file, output_file)
