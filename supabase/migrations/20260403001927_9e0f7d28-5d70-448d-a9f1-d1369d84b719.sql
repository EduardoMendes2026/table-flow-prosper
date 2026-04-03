
-- Create enum types
CREATE TYPE public.app_role AS ENUM ('admin_master', 'dono_restaurante', 'funcionario');
CREATE TYPE public.restaurant_status AS ENUM ('trial', 'active', 'blocked');
CREATE TYPE public.table_status AS ENUM ('available', 'occupied', 'reserved');
CREATE TYPE public.order_status AS ENUM ('open', 'sent_to_kitchen', 'ready', 'closed');
CREATE TYPE public.payment_method AS ENUM ('pix', 'credit', 'debit', 'cash');

-- Restaurants
CREATE TABLE public.restaurants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  status restaurant_status NOT NULL DEFAULT 'trial',
  trial_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  trial_expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  fingerprint TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, restaurant_id)
);

-- Menu categories
CREATE TABLE public.menu_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Menu items
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tables (mesas)
CREATE TABLE public.tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  number INT NOT NULL,
  capacity INT NOT NULL DEFAULT 4,
  status table_status NOT NULL DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, number)
);

-- Orders
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  customer_name TEXT,
  status order_status NOT NULL DEFAULT 'open',
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order items
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id),
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  method payment_method NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  change_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user's restaurant_id
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT restaurant_id FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for restaurants
CREATE POLICY "Admin master can do everything on restaurants"
  ON public.restaurants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Users can view their own restaurant"
  ON public.restaurants FOR SELECT TO authenticated
  USING (id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Owners can update their restaurant"
  ON public.restaurants FOR UPDATE TO authenticated
  USING (id = public.get_user_restaurant_id(auth.uid()) AND public.has_role(auth.uid(), 'dono_restaurante'));

-- RLS Policies for user_roles
CREATE POLICY "Admin master can manage all roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Users can view roles in their restaurant"
  ON public.user_roles FOR SELECT TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Owners can manage roles in their restaurant"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = public.get_user_restaurant_id(auth.uid()) AND public.has_role(auth.uid(), 'dono_restaurante'));

CREATE POLICY "Owners can delete roles in their restaurant"
  ON public.user_roles FOR DELETE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id(auth.uid()) AND public.has_role(auth.uid(), 'dono_restaurante'));

-- RLS for menu_categories
CREATE POLICY "Admin master full access menu_categories"
  ON public.menu_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Restaurant users can view menu_categories"
  ON public.menu_categories FOR SELECT TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Owners can manage menu_categories"
  ON public.menu_categories FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = public.get_user_restaurant_id(auth.uid()) AND public.has_role(auth.uid(), 'dono_restaurante'));

CREATE POLICY "Owners can update menu_categories"
  ON public.menu_categories FOR UPDATE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id(auth.uid()) AND public.has_role(auth.uid(), 'dono_restaurante'));

CREATE POLICY "Owners can delete menu_categories"
  ON public.menu_categories FOR DELETE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id(auth.uid()) AND public.has_role(auth.uid(), 'dono_restaurante'));

-- RLS for menu_items
CREATE POLICY "Admin master full access menu_items"
  ON public.menu_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Restaurant users can view menu_items"
  ON public.menu_items FOR SELECT TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Owners can manage menu_items"
  ON public.menu_items FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = public.get_user_restaurant_id(auth.uid()) AND public.has_role(auth.uid(), 'dono_restaurante'));

CREATE POLICY "Owners can update menu_items"
  ON public.menu_items FOR UPDATE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id(auth.uid()) AND public.has_role(auth.uid(), 'dono_restaurante'));

CREATE POLICY "Owners can delete menu_items"
  ON public.menu_items FOR DELETE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id(auth.uid()) AND public.has_role(auth.uid(), 'dono_restaurante'));

-- RLS for tables
CREATE POLICY "Admin master full access tables"
  ON public.tables FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Restaurant users can view tables"
  ON public.tables FOR SELECT TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Owners can manage tables"
  ON public.tables FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = public.get_user_restaurant_id(auth.uid()) AND public.has_role(auth.uid(), 'dono_restaurante'));

CREATE POLICY "Owners can update tables"
  ON public.tables FOR UPDATE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Owners can delete tables"
  ON public.tables FOR DELETE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id(auth.uid()) AND public.has_role(auth.uid(), 'dono_restaurante'));

-- RLS for orders
CREATE POLICY "Admin master full access orders"
  ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Restaurant users can view orders"
  ON public.orders FOR SELECT TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Restaurant users can create orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Restaurant users can update orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

-- RLS for order_items
CREATE POLICY "Admin master full access order_items"
  ON public.order_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Restaurant users can view order_items"
  ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.restaurant_id = public.get_user_restaurant_id(auth.uid())
  ));

CREATE POLICY "Restaurant users can create order_items"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.restaurant_id = public.get_user_restaurant_id(auth.uid())
  ));

CREATE POLICY "Restaurant users can update order_items"
  ON public.order_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.restaurant_id = public.get_user_restaurant_id(auth.uid())
  ));

-- RLS for payments
CREATE POLICY "Admin master full access payments"
  ON public.payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Restaurant users can view payments"
  ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.restaurant_id = public.get_user_restaurant_id(auth.uid())
  ));

CREATE POLICY "Restaurant users can create payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.restaurant_id = public.get_user_restaurant_id(auth.uid())
  ));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply triggers
CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for orders (kitchen)
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- Function to handle new user signup - creates restaurant + role
CREATE OR REPLACE FUNCTION public.handle_new_restaurant_signup()
RETURNS TRIGGER AS $$
DECLARE
  new_restaurant_id UUID;
BEGIN
  -- Create restaurant
  INSERT INTO public.restaurants (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'restaurant_name', 'Meu Restaurante'))
  RETURNING id INTO new_restaurant_id;

  -- Assign owner role
  INSERT INTO public.user_roles (user_id, role, restaurant_id, display_name)
  VALUES (NEW.id, 'dono_restaurante', new_restaurant_id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_restaurant_signup();
