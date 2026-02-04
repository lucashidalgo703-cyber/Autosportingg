from PIL import Image

def process_logo(input_path, output_path):
    print(f"Processing {input_path}...")
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()

        new_data = []
        for item in datas:
            r, g, b, a = item
            
            # 1. Detect White Background
            # If (R,G,B are high), make transparent
            if r > 220 and g > 220 and b > 220:
                new_data.append((255, 255, 255, 0)) # Transparent
                
            # 2. Detect Red Swoosh
            # Red is dominant. 
            elif r > 150 and r > g + 40 and r > b + 40:
                # Keep Red, ensure full opacity
                new_data.append((r, g, b, 255))
                
            # 3. Detect Blue/Dark Text
            # Not white, not red. Convert to WHITE.
            else:
                new_data.append((255, 255, 255, 255)) # Pure White

        img.putdata(new_data)
        img.save(output_path, "PNG")
        print(f"Success! Saved to {output_path}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Use the uploaded file path
    input_file = "C:/Users/USER/.gemini/antigravity/brain/29f07675-4bd2-4fd5-b270-449975b7c398/uploaded_media_1770220282014.png"
    output_file = "c:/Users/USER/.gemini/antigravity/scratch/Autosportingg/public/logo-header-final.png"
    process_logo(input_file, output_file)
